const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../middleware/rbac");
const {
  PROPERTY_TYPES,
  PLACE_TYPES,
  BOOKING_OPTIONS,
  STANDOUT_STAYS,
  toBoolean,
  sanitizeAmenities,
} = require("../utils/roomFilters");

/* ──────────────────────────────────────────────────────────
 * Helper: resolve which owner ID to scope queries to.
 * - If admin is impersonating, use the impersonated owner's ID.
 * - If user is an owner, use their own ID.
 * ────────────────────────────────────────────────────────── */
function resolveOwnerId(req) {
  if (req.impersonating && req.effectiveRole === ROLES.OWNER) {
    return req.effectiveUserId;
  }
  if (req.userRole === ROLES.OWNER) {
    return req.user.id;
  }
  return null;
}

function normalizeRoomPayload(input, { partial = false } = {}) {
  const updates = {};
  const errors = [];

  if (!partial || input.title !== undefined) {
    if (!input.title || !String(input.title).trim()) {
      errors.push("Title is required");
    } else {
      updates.title = String(input.title).trim();
    }
  }

  if (!partial || input.location !== undefined) {
    if (!input.location || !String(input.location).trim()) {
      errors.push("Location is required");
    } else {
      updates.location = String(input.location).trim();
    }
  }

  if (input.type !== undefined) {
    updates.type = String(input.type || "room").trim().toLowerCase();
  } else if (!partial) {
    updates.type = "room";
  }

  if (!partial || input.guests !== undefined) {
    const parsedGuests = Number(input.guests);
    if (!Number.isFinite(parsedGuests) || parsedGuests <= 0) {
      errors.push("Guests must be greater than 0");
    } else {
      updates.guests = parsedGuests;
    }
  }

  if (!partial || input.price_per_day !== undefined) {
    const parsedPrice = Number(input.price_per_day);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      errors.push("Price per day must be 0 or higher");
    } else {
      updates.price_per_day = parsedPrice;
    }
  }

  if (input.image !== undefined) {
    updates.image = input.image ? String(input.image).trim() : null;
  } else if (!partial) {
    updates.image = null;
  }

  if (input.tags !== undefined) {
    updates.tags = Array.isArray(input.tags)
      ? input.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [];
  } else if (!partial) {
    updates.tags = [];
  }

  if (!partial || input.property_type !== undefined) {
    const propertyType = String(input.property_type || "")
      .trim()
      .toLowerCase();
    if (!PROPERTY_TYPES.includes(propertyType)) {
      errors.push(`property_type must be one of: ${PROPERTY_TYPES.join(", ")}`);
    } else {
      updates.property_type = propertyType;
    }
  }

  if (!partial || input.place_type !== undefined) {
    const placeType = String(input.place_type || "")
      .trim()
      .toLowerCase();
    if (!PLACE_TYPES.includes(placeType)) {
      errors.push(`place_type must be one of: ${PLACE_TYPES.join(", ")}`);
    } else {
      updates.place_type = placeType;
    }
  }

  if (input.bedrooms !== undefined) {
    const parsed = Number(input.bedrooms);
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors.push("bedrooms must be 0 or higher");
    } else {
      updates.bedrooms = parsed;
    }
  }

  if (input.beds !== undefined) {
    const parsed = Number(input.beds);
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors.push("beds must be 0 or higher");
    } else {
      updates.beds = parsed;
    }
  }

  if (input.bathrooms !== undefined) {
    const parsed = Number(input.bathrooms);
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors.push("bathrooms must be 0 or higher");
    } else {
      updates.bathrooms = parsed;
    }
  }

  BOOKING_OPTIONS.forEach((field) => {
    if (!partial || input[field] !== undefined) {
      updates[field] = toBoolean(input[field]);
    }
  });

  STANDOUT_STAYS.forEach((field) => {
    if (!partial || input[field] !== undefined) {
      updates[field] = toBoolean(input[field]);
    }
  });

  if (
    !partial ||
    input.amenities !== undefined ||
    input.safety_features !== undefined
  ) {
    const { amenities, safetyFeatures } = sanitizeAmenities(
      input.amenities,
      input.safety_features
    );
    updates.amenities = amenities;
    updates.safety_features = safetyFeatures;

    if (!partial && amenities.length === 0) {
      errors.push("At least one amenity is required");
    }
  }

  if (errors.length) {
    throw ApiError.badRequest(errors.join(". "));
  }

  return updates;
}

/* ══════════════════════════════════════════════════════════
 * ROOMS — Owner's rooms (rooms they created / are assigned to)
 * ══════════════════════════════════════════════════════════ */

/**
 * GET /api/owner/rooms
 * List rooms that belong to the effective owner.
 */
exports.getMyRooms = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { search, limit = 50, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from("rooms")
    .select("*", { count: "exact" })
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,location.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  res.json({ rooms: data, total: count });
});

/**
 * POST /api/owner/rooms
 * Create a room belonging to the effective owner.
 */
exports.createRoom = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const roomData = normalizeRoomPayload(req.body, { partial: false });
  roomData.id = require("crypto").randomUUID();
  roomData.owner_id = ownerId;

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .insert([roomData])
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  res.status(201).json({ room: data });
});

/**
 * PUT /api/owner/rooms/:id
 * Update a room that belongs to the effective owner.
 */
exports.updateRoom = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const updates = normalizeRoomPayload(req.body, { partial: true });

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .update(updates)
    .eq("id", req.params.id)
    .eq("owner_id", ownerId) // Scoped to this owner
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Room not found or you don't own it");

  res.json({ room: data });
});

/**
 * DELETE /api/owner/rooms/:id
 * Delete a room that belongs to the effective owner.
 */
exports.deleteRoom = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  // Verify ownership before deleting
  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("id, owner_id")
    .eq("id", req.params.id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!room) throw ApiError.notFound("Room not found or you don't own it");

  const { error } = await supabaseAdmin
    .from("rooms")
    .delete()
    .eq("id", req.params.id)
    .eq("owner_id", ownerId);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "Room deleted successfully" });
});

/* ══════════════════════════════════════════════════════════
 * BOOKINGS — Bookings on the owner's rooms
 * ══════════════════════════════════════════════════════════ */

/**
 * GET /api/owner/bookings
 * List all bookings on rooms that belong to the effective owner.
 */
exports.getMyBookings = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { status, limit = 50, offset = 0 } = req.query;

  // Get the owner's rooms (full data, used to attach to each booking)
  const { data: ownerRooms, error: roomError } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("owner_id", ownerId);

  if (roomError) throw ApiError.internal(roomError.message);

  const roomIds = (ownerRooms || []).map((r) => r.id);

  if (roomIds.length === 0) {
    return res.json({ bookings: [], total: 0 });
  }

  // Build a lookup map for rooms
  const roomsMap = {};
  (ownerRooms || []).forEach((r) => { roomsMap[r.id] = r; });

  // Fetch bookings without the join (avoids FK dependency)
  let query = supabaseAdmin
    .from("bookings")
    .select("*", { count: "exact" })
    .in("room_id", roomIds)
    .order("booking_date", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  // Attach room data to each booking
  const bookingsWithRoom = (data || []).map((booking) => ({
    ...booking,
    room: roomsMap[booking.room_id] || null,
  }));

  res.json({ bookings: bookingsWithRoom, total: count });
});

/**
 * PATCH /api/owner/bookings/:id/approve
 * Approve a booking on one of the owner's rooms.
 */
exports.approveBooking = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  // Verify the booking belongs to one of the owner's rooms
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, room_id, user_id, booking_date, user_email")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!booking) throw ApiError.notFound("Booking not found");

  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("id", booking.room_id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!room) throw ApiError.forbidden("This booking is not on one of your rooms");

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ status: "approved" })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  // Attach room data
  data.room = room;

  // Notify the customer
  const { emitNotificationToUser } = require("../socket");

  const notification = {
    recipient_user_id: data.user_id,
    type: "booking_approved",
    title: "Booking Confirmed!",
    body: `Your booking for ${data.booking_date} has been approved.`,
    data: { booking_id: data.id, room_id: data.room_id, booking_date: data.booking_date },
  };

  const { data: savedNotif } = await supabaseAdmin
    .from("notifications")
    .insert(notification)
    .select()
    .single();

  emitNotificationToUser(data.user_id, savedNotif || notification);

  res.json({ booking: data });
});

/**
 * PATCH /api/owner/bookings/:id/reject
 * Reject a booking on one of the owner's rooms.
 */
exports.rejectBooking = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { reason } = req.body;

  // Verify the booking belongs to one of the owner's rooms
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, room_id, user_id, booking_date")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!booking) throw ApiError.notFound("Booking not found");

  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("id", booking.room_id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!room) throw ApiError.forbidden("This booking is not on one of your rooms");

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ status: "rejected" })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  // Attach room data
  data.room = room;

  // Notify the customer
  const { emitNotificationToUser } = require("../socket");

  const reasonText = reason?.trim() ? ` Reason: ${reason.trim()}` : "";
  const notification = {
    recipient_user_id: data.user_id,
    type: "booking_rejected",
    title: "Booking Not Approved",
    body: `Your booking request for ${data.booking_date} was not approved.${reasonText}`,
    data: {
      booking_id: data.id,
      room_id: data.room_id,
      booking_date: data.booking_date,
      reason: reason?.trim() || null,
    },
  };

  const { data: savedNotif } = await supabaseAdmin
    .from("notifications")
    .insert(notification)
    .select()
    .single();

  emitNotificationToUser(data.user_id, savedNotif || notification);

  res.json({ booking: data });
});

/* ══════════════════════════════════════════════════════════
 * CUSTOMERS — Users who have booked on the owner's rooms
 * ══════════════════════════════════════════════════════════ */

/**
 * GET /api/owner/customers
 * List unique customers who have bookings on the owner's rooms.
 */
exports.getMyCustomers = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { search, limit = 50, offset = 0 } = req.query;

  // Get owner's room IDs
  const { data: ownerRooms, error: roomError } = await supabaseAdmin
    .from("rooms")
    .select("id")
    .eq("owner_id", ownerId);

  if (roomError) throw ApiError.internal(roomError.message);

  const roomIds = (ownerRooms || []).map((r) => r.id);

  if (roomIds.length === 0) {
    return res.json({ customers: [], total: 0 });
  }

  // Get unique user IDs from bookings on these rooms
  const { data: bookings, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .select("user_id")
    .in("room_id", roomIds);

  if (bookingError) throw ApiError.internal(bookingError.message);

  const uniqueUserIds = [...new Set((bookings || []).map((b) => b.user_id).filter(Boolean))];

  if (uniqueUserIds.length === 0) {
    return res.json({ customers: [], total: 0 });
  }

  // Fetch customer profiles
  let query = supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact" })
    .in("id", uniqueUserIds)
    .order("created_at", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data: customers, error: customerError, count } = await query;
  if (customerError) throw ApiError.internal(customerError.message);

  res.json({ customers, total: count });
});

/**
 * GET /api/owner/customers/:customerId
 * Get a specific customer's profile (only if they've booked on the owner's rooms).
 */
exports.getCustomer = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  // Verify this customer has booked on one of the owner's rooms
  const { data: ownerRooms } = await supabaseAdmin
    .from("rooms")
    .select("id")
    .eq("owner_id", ownerId);

  const roomIds = (ownerRooms || []).map((r) => r.id);

  if (roomIds.length === 0) {
    throw ApiError.notFound("Customer not found");
  }

  const { data: hasBooking } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("user_id", req.params.customerId)
    .in("room_id", roomIds)
    .limit(1);

  if (!hasBooking || hasBooking.length === 0) {
    throw ApiError.notFound("Customer not found or has no bookings on your rooms");
  }

  const { data: customer, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", req.params.customerId)
    .maybeSingle();

  if (error) throw ApiError.internal(error.message);
  if (!customer) throw ApiError.notFound("Customer not found");

  res.json({ customer });
});

/**
 * GET /api/owner/customers/:customerId/bookings
 * Get bookings for a specific customer on the owner's rooms.
 */
exports.getCustomerBookings = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  // Get owner's rooms (full data for attaching to bookings)
  const { data: ownerRooms } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("owner_id", ownerId);

  const roomIds = (ownerRooms || []).map((r) => r.id);

  if (roomIds.length === 0) {
    return res.json({ bookings: [] });
  }

  const roomsMap = {};
  (ownerRooms || []).forEach((r) => { roomsMap[r.id] = r; });

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("user_id", req.params.customerId)
    .in("room_id", roomIds)
    .order("booking_date", { ascending: false });

  if (error) throw ApiError.internal(error.message);

  const bookingsWithRoom = (data || []).map((b) => ({
    ...b,
    room: roomsMap[b.room_id] || null,
  }));

  res.json({ bookings: bookingsWithRoom });
});

/**
 * GET /api/owner/profile
 * Get the owner's own profile.
 */
exports.getMyProfile = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", ownerId)
    .maybeSingle();

  if (error) throw ApiError.internal(error.message);

  res.json({ profile: data });
});

/**
 * GET /api/owner/stats
 * Dashboard stats for the owner.
 */
exports.getStats = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  // Count rooms
  const { count: totalRooms } = await supabaseAdmin
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId);

  // Get room IDs for booking queries
  const { data: ownerRooms } = await supabaseAdmin
    .from("rooms")
    .select("id")
    .eq("owner_id", ownerId);

  const roomIds = (ownerRooms || []).map((r) => r.id);

  let totalBookings = 0;
  let pendingBookings = 0;
  let totalCustomers = 0;

  if (roomIds.length > 0) {
    const { count: bookingCount } = await supabaseAdmin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("room_id", roomIds);

    totalBookings = bookingCount || 0;

    const { count: pendingCount } = await supabaseAdmin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("room_id", roomIds)
      .eq("status", "pending");

    pendingBookings = pendingCount || 0;

    // Unique customers
    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select("user_id")
      .in("room_id", roomIds);

    const uniqueCustomers = new Set(
      (bookings || []).map((b) => b.user_id).filter(Boolean)
    );
    totalCustomers = uniqueCustomers.size;
  }

  res.json({
    stats: {
      total_rooms: totalRooms || 0,
      total_bookings: totalBookings,
      pending_bookings: pendingBookings,
      total_customers: totalCustomers,
    },
  });
});
