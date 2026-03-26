const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../middleware/rbac");
const { syncRoomInsert, syncRoomUpdate, syncRoomDelete } = require("../utils/algoliaSync");

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

  const {
    title, location, type, guests, price_per_day, image, tags,
    property_type, place_type, bedrooms, beds, bathrooms,
    instant_book, self_checkin, allows_pets,
    is_guest_favorite, is_luxe, amenities, safety_features,
    images, description,
  } = req.body;

  if (!title || !location) {
    throw ApiError.badRequest("Title and location are required");
  }

  const roomData = {
    id: require("crypto").randomUUID(),
    title: title.trim(),
    location: location.trim(),
    type: type || "room",
    guests: Number(guests) || 2,
    price_per_day: Number(price_per_day) || 0,
    image: image || null,
    tags: Array.isArray(tags) ? tags : [],
    owner_id: ownerId,
    property_type: property_type || "house",
    place_type: place_type || "entire_home",
    bedrooms: Number(bedrooms) || 1,
    beds: Number(beds) || 1,
    bathrooms: Number(bathrooms) || 1,
    instant_book: Boolean(instant_book),
    self_checkin: Boolean(self_checkin),
    allows_pets: Boolean(allows_pets),
    is_guest_favorite: Boolean(is_guest_favorite),
    is_luxe: Boolean(is_luxe),
    amenities: Array.isArray(amenities) ? amenities : [],
    safety_features: Array.isArray(safety_features) ? safety_features : [],
    images: Array.isArray(images) ? images : [],
    description: typeof description === "string" ? description.trim() : "",
  };

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .insert([roomData])
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  syncRoomInsert(data);

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

  const {
    title, location, type, guests, price_per_day, image, tags,
    property_type, place_type, bedrooms, beds, bathrooms,
    instant_book, self_checkin, allows_pets,
    is_guest_favorite, is_luxe, amenities, safety_features,
    images, description,
  } = req.body;

  const updates = {};
  if (title !== undefined) updates.title = title.trim();
  if (location !== undefined) updates.location = location.trim();
  if (type !== undefined) updates.type = type;
  if (guests !== undefined) updates.guests = Number(guests);
  if (price_per_day !== undefined) updates.price_per_day = Number(price_per_day);
  if (image !== undefined) updates.image = image || null;
  if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
  if (property_type !== undefined) updates.property_type = property_type;
  if (place_type !== undefined) updates.place_type = place_type;
  if (bedrooms !== undefined) updates.bedrooms = Number(bedrooms);
  if (beds !== undefined) updates.beds = Number(beds);
  if (bathrooms !== undefined) updates.bathrooms = Number(bathrooms);
  if (instant_book !== undefined) updates.instant_book = Boolean(instant_book);
  if (self_checkin !== undefined) updates.self_checkin = Boolean(self_checkin);
  if (allows_pets !== undefined) updates.allows_pets = Boolean(allows_pets);
  if (is_guest_favorite !== undefined) updates.is_guest_favorite = Boolean(is_guest_favorite);
  if (is_luxe !== undefined) updates.is_luxe = Boolean(is_luxe);
  if (amenities !== undefined) updates.amenities = Array.isArray(amenities) ? amenities : [];
  if (safety_features !== undefined) updates.safety_features = Array.isArray(safety_features) ? safety_features : [];
  if (images !== undefined) updates.images = Array.isArray(images) ? images : [];
  if (description !== undefined) updates.description = typeof description === "string" ? description.trim() : "";

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .update(updates)
    .eq("id", req.params.id)
    .eq("owner_id", ownerId) // Scoped to this owner
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Room not found or you don't own it");

  syncRoomUpdate(data);

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

  const deletedId = req.params.id;

  const { error } = await supabaseAdmin
    .from("rooms")
    .delete()
    .eq("id", deletedId)
    .eq("owner_id", ownerId);

  if (error) throw ApiError.internal(error.message);

  syncRoomDelete(deletedId);

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

/**
 * PATCH /api/owner/bookings/:id/check-in
 */
exports.checkInBooking = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("*")
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

  if (!["approved", "confirmed"].includes(booking.status)) {
    throw ApiError.badRequest(`Cannot check in a booking with status "${booking.status}". Must be approved or confirmed.`);
  }

  const checkedInAt = new Date().toISOString();
  const updates = {
    status: "checked_in",
    checked_in_at: checkedInAt,
  };

  if (
    booking.payment_status === "pay_at_property" ||
    booking.payment_method === "cash" ||
    booking.payment_method === "pay_at_property"
  ) {
    updates.payment_status = "paid";
    updates.paid_at = booking.paid_at || checkedInAt;
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  data.room = room;

  const { emitNotificationToUser } = require("../socket");
  const notification = {
    recipient_user_id: data.user_id,
    type: "booking_updated",
    title: "Checked In!",
    body: `You have been checked in for your booking on ${data.booking_date}.`,
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
 * PATCH /api/owner/bookings/:id/check-out
 */
exports.checkOutBooking = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("*")
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

  if (booking.status !== "checked_in") {
    throw ApiError.badRequest(`Cannot check out a booking with status "${booking.status}". Must be checked_in.`);
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ status: "checked_out", checked_out_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  data.room = room;

  const { emitNotificationToUser } = require("../socket");
  const notification = {
    recipient_user_id: data.user_id,
    type: "booking_updated",
    title: "Checked Out",
    body: `You have been checked out for your booking on ${data.booking_date}. Thank you for your stay!`,
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
 * GET /api/owner/bookings/today
 */
exports.getTodayBookings = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const { data: ownerRooms } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("owner_id", ownerId);

  const roomIds = (ownerRooms || []).map((r) => r.id);

  if (roomIds.length === 0) {
    return res.json({ bookings: [], total: 0 });
  }

  const roomsMap = {};
  (ownerRooms || []).forEach((r) => { roomsMap[r.id] = r; });

  const { data, error, count } = await supabaseAdmin
    .from("bookings")
    .select("*", { count: "exact" })
    .eq("booking_date", today)
    .in("room_id", roomIds)
    .in("status", ["approved", "confirmed", "checked_in"])
    .order("created_at", { ascending: true });

  if (error) throw ApiError.internal(error.message);

  const bookingsWithRoom = (data || []).map((b) => ({
    ...b,
    room: roomsMap[b.room_id] || null,
  }));

  res.json({ bookings: bookingsWithRoom, total: count });
});

/**
 * GET /api/owner/bookings/history?tab=no_show|completed|rejected|cancelled
 */
exports.getBookingHistory = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { tab, limit = 50, offset = 0 } = req.query;

  if (!tab || !["no_show", "completed", "rejected", "cancelled"].includes(tab)) {
    throw ApiError.badRequest("tab query parameter is required: no_show, completed, rejected, cancelled");
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const { data: ownerRooms } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("owner_id", ownerId);

  const roomIds = (ownerRooms || []).map((r) => r.id);

  if (roomIds.length === 0) {
    return res.json({ bookings: [], total: 0 });
  }

  const roomsMap = {};
  (ownerRooms || []).forEach((r) => { roomsMap[r.id] = r; });

  let query = supabaseAdmin
    .from("bookings")
    .select("*", { count: "exact" })
    .in("room_id", roomIds)
    .order("booking_date", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  switch (tab) {
    case "no_show":
      query = query
        .lt("booking_date", today)
        .in("status", ["pending", "approved", "confirmed"]);
      break;
    case "completed":
      query = query.eq("status", "checked_out");
      break;
    case "rejected":
      query = query.eq("status", "rejected");
      break;
    case "cancelled":
      query = query.eq("status", "cancelled");
      break;
  }

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  const bookingsWithRoom = (data || []).map((b) => ({
    ...b,
    room: roomsMap[b.room_id] || null,
  }));

  res.json({ bookings: bookingsWithRoom, total: count });
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

  let rating = 0;
  let review_count = 0;
  let years_hosting = 0;

  if (data) {
    // Compute years_hosting from profile created_at
    if (data.created_at) {
      const createdYear = new Date(data.created_at).getFullYear();
      const currentYear = new Date().getFullYear();
      years_hosting = currentYear - createdYear;
    }

    // Compute rating and review_count from reviews on owner's rooms
    const { data: ownerRooms } = await supabaseAdmin
      .from("rooms")
      .select("id")
      .eq("owner_id", ownerId);

    const roomIds = (ownerRooms || []).map((r) => r.id);
    if (roomIds.length > 0) {
      const { data: reviews } = await supabaseAdmin
        .from("room_reviews")
        .select("rating")
        .in("room_id", roomIds);

      if (reviews && reviews.length > 0) {
        review_count = reviews.length;
        const sum = reviews.reduce((s, r) => s + r.rating, 0);
        rating = Math.round((sum / review_count) * 100) / 100;
      }
    }
  }

  res.json({
    profile: data ? { ...data, rating, review_count, years_hosting } : data,
  });
});

/**
 * PUT /api/owner/profile
 * Update the owner's host-specific profile fields.
 */
exports.updateMyProfile = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const {
    full_name, phone, bio, avatar_url, cover_photo_url,
    languages, specialties, response_time, response_rate,
    is_superhost, identity_verified,
    accepts_cohosts,
  } = req.body;

  const updates = { updated_at: new Date().toISOString() };
  if (full_name !== undefined) updates.full_name = full_name?.trim() || null;
  if (phone !== undefined) updates.phone = phone?.trim() || null;
  if (bio !== undefined) updates.bio = typeof bio === "string" ? bio.trim() : null;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url?.trim() || null;
  if (cover_photo_url !== undefined) updates.cover_photo_url = cover_photo_url?.trim() || null;
  if (languages !== undefined) updates.languages = Array.isArray(languages) ? languages : [];
  if (specialties !== undefined) updates.specialties = Array.isArray(specialties) ? specialties : [];
  if (response_time !== undefined) updates.response_time = response_time?.trim() || null;
  if (response_rate !== undefined) updates.response_rate = Math.max(0, Math.min(100, Number(response_rate) || 0));
  if (is_superhost !== undefined) updates.is_superhost = Boolean(is_superhost);
  if (identity_verified !== undefined) updates.identity_verified = Boolean(identity_verified);
  if (accepts_cohosts !== undefined) updates.accepts_cohosts = Boolean(accepts_cohosts);

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", ownerId)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Profile not found");

  res.json({ profile: data });
});

/* ══════════════════════════════════════════════════════════
 * CO-HOSTS — Manage co-host relationships
 * ══════════════════════════════════════════════════════════ */

/**
 * GET /api/owner/co-hosts
 * List co-hosts for the current owner (as primary host).
 */
exports.getMyCoHosts = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { data, error } = await supabaseAdmin
    .from("co_hosts")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw ApiError.internal(error.message);

  // Fetch co-host profile details
  const coHostIds = (data || []).map((c) => c.co_host_id).filter(Boolean);
  let profiles = [];
  if (coHostIds.length > 0) {
    const { data: pData } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, is_superhost")
      .in("id", coHostIds);
    profiles = pData || [];
  }

  const profilesMap = {};
  profiles.forEach((p) => { profilesMap[p.id] = p; });

  const coHosts = (data || []).map((c) => ({
    ...c,
    co_host_profile: profilesMap[c.co_host_id] || null,
  }));

  res.json({ co_hosts: coHosts });
});

/**
 * GET /api/owner/co-host-invites
 * List co-host invitations received by the current owner.
 */
exports.getMyCoHostInvites = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { data, error } = await supabaseAdmin
    .from("co_hosts")
    .select("*")
    .eq("co_host_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw ApiError.internal(error.message);

  const ownerIds = (data || []).map((c) => c.owner_id).filter(Boolean);
  let profiles = [];
  if (ownerIds.length > 0) {
    const { data: pData } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, is_superhost")
      .in("id", ownerIds);
    profiles = pData || [];
  }

  const profilesMap = {};
  profiles.forEach((p) => { profilesMap[p.id] = p; });

  const invites = (data || []).map((c) => ({
    ...c,
    owner_profile: profilesMap[c.owner_id] || null,
  }));

  res.json({ invites });
});

/**
 * POST /api/owner/co-hosts
 * Invite a co-host by email. The target must be an existing owner.
 */
exports.inviteCoHost = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { email } = req.body;
  if (!email?.trim()) throw ApiError.badRequest("Co-host email is required");

  // Find the target owner by email
  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, user_type")
    .eq("email", email.trim().toLowerCase())
    .eq("user_type", ROLES.OWNER)
    .maybeSingle();

  if (!target) throw ApiError.notFound("No owner account found with that email");
  if (target.id === ownerId) throw ApiError.badRequest("You cannot invite yourself as a co-host");

  // Check for existing relationship
  const { data: existing } = await supabaseAdmin
    .from("co_hosts")
    .select("id, status")
    .eq("owner_id", ownerId)
    .eq("co_host_id", target.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "pending" || existing.status === "accepted") {
      throw ApiError.badRequest("A co-host relationship already exists with this owner");
    }
    // Re-invite if previously rejected/removed
    const { data, error } = await supabaseAdmin
      .from("co_hosts")
      .update({ status: "pending", invited_at: new Date().toISOString(), responded_at: null, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw ApiError.internal(error.message);
    return res.json({ co_host: data });
  }

  const { data, error } = await supabaseAdmin
    .from("co_hosts")
    .insert({
      owner_id: ownerId,
      co_host_id: target.id,
      status: "pending",
      permissions: ["view_bookings", "view_rooms"],
    })
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  // Send notification to the co-host
  const { emitNotificationToUser } = require("../socket");
  const { data: ownerProfile } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", ownerId)
    .maybeSingle();

  const notification = {
    recipient_user_id: target.id,
    type: "co_host_invite",
    title: "Co-host Invitation",
    body: `${ownerProfile?.full_name || "A host"} has invited you to be a co-host.`,
    data: { co_host_id: data.id, owner_id: ownerId },
  };

  const { data: savedNotif } = await supabaseAdmin
    .from("notifications")
    .insert(notification)
    .select()
    .single();

  emitNotificationToUser(target.id, savedNotif || notification);

  res.status(201).json({ co_host: data });
});

/**
 * PATCH /api/owner/co-hosts/:id/respond
 * Accept or reject a co-host invitation.
 */
exports.respondToCoHostInvite = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { action } = req.body;
  if (!["accept", "reject"].includes(action)) {
    throw ApiError.badRequest("Action must be 'accept' or 'reject'");
  }

  const { data: invite } = await supabaseAdmin
    .from("co_hosts")
    .select("*")
    .eq("id", req.params.id)
    .eq("co_host_id", ownerId)
    .eq("status", "pending")
    .maybeSingle();

  if (!invite) throw ApiError.notFound("Invitation not found or already responded");

  const newStatus = action === "accept" ? "accepted" : "rejected";

  const { data, error } = await supabaseAdmin
    .from("co_hosts")
    .update({ status: newStatus, responded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  // Notify the primary owner
  const { emitNotificationToUser } = require("../socket");
  const { data: coHostProfile } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", ownerId)
    .maybeSingle();

  const notification = {
    recipient_user_id: invite.owner_id,
    type: "co_host_response",
    title: action === "accept" ? "Co-host Accepted!" : "Co-host Declined",
    body: `${coHostProfile?.full_name || "A host"} has ${action === "accept" ? "accepted" : "declined"} your co-host invitation.`,
    data: { co_host_id: data.id, co_host_user_id: ownerId },
  };

  const { data: savedNotif } = await supabaseAdmin
    .from("notifications")
    .insert(notification)
    .select()
    .single();

  emitNotificationToUser(invite.owner_id, savedNotif || notification);

  res.json({ co_host: data });
});

/**
 * PATCH /api/owner/co-hosts/:id/permissions
 * Update co-host permissions.
 */
exports.updateCoHostPermissions = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { permissions } = req.body;
  if (!Array.isArray(permissions)) throw ApiError.badRequest("Permissions must be an array");

  const validPermissions = ["view_bookings", "manage_bookings", "view_rooms", "manage_rooms", "view_customers", "manage_checkin"];
  const filtered = permissions.filter((p) => validPermissions.includes(p));

  const { data, error } = await supabaseAdmin
    .from("co_hosts")
    .update({ permissions: filtered, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .eq("owner_id", ownerId)
    .eq("status", "accepted")
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Co-host relationship not found");

  res.json({ co_host: data });
});

/**
 * DELETE /api/owner/co-hosts/:id
 * Remove a co-host relationship.
 */
exports.removeCoHost = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  // Owner can remove co-hosts they invited, or co-hosts can remove themselves
  const { data: record } = await supabaseAdmin
    .from("co_hosts")
    .select("*")
    .eq("id", req.params.id)
    .or(`owner_id.eq.${ownerId},co_host_id.eq.${ownerId}`)
    .maybeSingle();

  if (!record) throw ApiError.notFound("Co-host relationship not found");

  const { error } = await supabaseAdmin
    .from("co_hosts")
    .delete()
    .eq("id", req.params.id);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "Co-host removed successfully" });
});

/**
 * GET /api/owner/stats
 * Dashboard stats for the owner (legacy — kept for backward compat).
 */
exports.getStats = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { count: totalRooms } = await supabaseAdmin
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId);

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

/**
 * GET /api/owner/analytics?period=7d|30d|6m|all
 * Rich analytics dashboard data scoped to the owner's rooms.
 */
exports.getAnalytics = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const period = req.query.period || "6m";
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  let periodStart = null;
  if (period === "7d") {
    periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 7);
  } else if (period === "30d") {
    periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 30);
  } else if (period === "6m") {
    periodStart = new Date(now);
    periodStart.setMonth(periodStart.getMonth() - 6);
  }
  const periodFilter = periodStart ? periodStart.toISOString().split("T")[0] : null;

  const { data: ownerRooms, error: rErr } = await supabaseAdmin
    .from("rooms")
    .select("id, title, image")
    .eq("owner_id", ownerId);
  if (rErr) throw ApiError.internal(rErr.message);

  const roomIds = (ownerRooms || []).map((r) => r.id);
  const roomsMap = {};
  (ownerRooms || []).forEach((r) => { roomsMap[r.id] = r; });

  if (roomIds.length === 0) {
    return res.json({
      revenue: { total: 0, this_month: 0, last_month: 0, growth_percent: 0 },
      funnel: { total: 0, approved: 0, confirmed: 0, checked_in: 0, checked_out: 0, rejected: 0, cancelled: 0, no_show: 0, pending: 0 },
      completion_rate: 0,
      time_series: [],
      top_rooms: [],
      today: { bookings: 0, check_ins: 0, check_outs: 0, pending: 0 },
      totals: { bookings: 0, rooms: 0, customers: 0, pending: 0 },
    });
  }

  let bookingsQuery = supabaseAdmin
    .from("bookings")
    .select("id, room_id, user_id, booking_date, total_price, status, payment_status, payment_method, checked_in_at, checked_out_at, created_at")
    .in("room_id", roomIds);
  if (periodFilter) {
    bookingsQuery = bookingsQuery.gte("created_at", periodFilter);
  }
  const { data: bookings, error: bErr } = await bookingsQuery;
  if (bErr) throw ApiError.internal(bErr.message);

  const all = bookings || [];

  // ── Revenue ────────────────────────────────────────
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}-01`;
  const lastMonthEnd = thisMonthStart;

  const totalRevenue = all.reduce((s, b) => s + (b.total_price || 0), 0);
  const revenueThisMonth = all
    .filter((b) => b.created_at >= thisMonthStart)
    .reduce((s, b) => s + (b.total_price || 0), 0);
  const revenueLastMonth = all
    .filter((b) => b.created_at >= lastMonthStart && b.created_at < lastMonthEnd)
    .reduce((s, b) => s + (b.total_price || 0), 0);
  const revenueGrowth = revenueLastMonth > 0
    ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
    : revenueThisMonth > 0 ? 100 : 0;

  // ── Booking funnel ─────────────────────────────────
  const funnel = { total: all.length, approved: 0, confirmed: 0, checked_in: 0, checked_out: 0, rejected: 0, cancelled: 0, no_show: 0, pending: 0 };
  all.forEach((b) => {
    const s = b.status;
    if (s === "pending") funnel.pending++;
    if (s === "approved" || s === "confirmed" || s === "checked_in" || s === "checked_out") funnel.approved++;
    if (s === "confirmed" || s === "checked_in" || s === "checked_out") funnel.confirmed++;
    if (s === "checked_in" || s === "checked_out") funnel.checked_in++;
    if (s === "checked_out") funnel.checked_out++;
    if (s === "rejected") funnel.rejected++;
    if (s === "cancelled") funnel.cancelled++;
    if (s === "no_show") funnel.no_show++;
    if ((s === "approved" || s === "confirmed") && b.booking_date < today && !b.checked_in_at) {
      funnel.no_show++;
    }
  });

  const nonCancelled = all.filter((b) => b.status !== "cancelled" && b.status !== "rejected").length;
  const completionRate = nonCancelled > 0 ? Math.round((funnel.checked_out / nonCancelled) * 100) : 0;

  // ── Time-series (monthly) ──────────────────────────
  const monthlyMap = {};
  all.forEach((b) => {
    const month = (b.created_at || b.booking_date || "").slice(0, 7);
    if (!month) return;
    if (!monthlyMap[month]) monthlyMap[month] = { month, revenue: 0, bookings: 0 };
    monthlyMap[month].revenue += b.total_price || 0;
    monthlyMap[month].bookings++;
  });
  const timeSeries = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  // ── Top rooms by revenue ───────────────────────────
  const roomRevMap = {};
  all.forEach((b) => {
    if (!roomRevMap[b.room_id]) roomRevMap[b.room_id] = { revenue: 0, bookings: 0 };
    roomRevMap[b.room_id].revenue += b.total_price || 0;
    roomRevMap[b.room_id].bookings++;
  });
  const topRooms = Object.entries(roomRevMap)
    .map(([roomId, data]) => ({
      room_id: roomId,
      title: roomsMap[roomId]?.title || "Unknown Room",
      image: roomsMap[roomId]?.image || null,
      revenue: data.revenue,
      bookings: data.bookings,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ── Today's snapshot ───────────────────────────────
  const todayBookings = all.filter((b) => b.booking_date === today).length;
  const todayCheckIns = all.filter((b) => b.checked_in_at && b.checked_in_at.startsWith(today)).length;
  const todayCheckOuts = all.filter((b) => b.checked_out_at && b.checked_out_at.startsWith(today)).length;
  const todayPending = all.filter((b) => b.status === "pending").length;

  // ── Unique customers ───────────────────────────────
  const uniqueCustomers = new Set(all.map((b) => b.user_id).filter(Boolean));

  // ── Active rooms (rooms with bookings this month) ──
  const activeRoomIds = new Set(
    all.filter((b) => b.created_at >= thisMonthStart).map((b) => b.room_id)
  );

  res.json({
    revenue: {
      total: totalRevenue,
      this_month: revenueThisMonth,
      last_month: revenueLastMonth,
      growth_percent: revenueGrowth,
    },
    funnel,
    completion_rate: completionRate,
    time_series: timeSeries,
    top_rooms: topRooms,
    today: {
      bookings: todayBookings,
      check_ins: todayCheckIns,
      check_outs: todayCheckOuts,
      pending: todayPending,
    },
    totals: {
      bookings: all.length,
      rooms: roomIds.length,
      active_rooms: activeRoomIds.size,
      customers: uniqueCustomers.size,
      pending: funnel.pending,
    },
  });
});
