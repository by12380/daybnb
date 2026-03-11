const { supabase, supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../middleware/rbac");
const { emitNotificationToUser, emitNotificationToRole } = require("../socket");
const { syncBookingChange } = require("../utils/algoliaSync");

/**
 * GET /api/bookings
 * Admin: returns all bookings.
 * Owner: returns bookings on their rooms.
 * Customer: returns only their own bookings.
 */
exports.getAll = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { status, room_id, limit = 50, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from("bookings")
    .select("*", { count: "exact" })
    .order("booking_date", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (req.userRole === ROLES.ADMIN) {
    // Admin sees all bookings
  } else if (req.userRole === ROLES.OWNER) {
    // Owner sees bookings on their rooms
    const { data: ownerRooms } = await supabaseAdmin
      .from("rooms")
      .select("id")
      .eq("owner_id", req.user.id);

    const roomIds = (ownerRooms || []).map((r) => r.id);
    if (roomIds.length === 0) {
      return res.json({ bookings: [], total: 0 });
    }
    query = query.in("room_id", roomIds);
  } else {
    // Customer sees only their own bookings
    query = query.eq("user_id", req.user.id);
  }

  if (status) query = query.eq("status", status);
  if (room_id) query = query.eq("room_id", room_id);

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  res.json({ bookings: data, total: count });
});

/**
 * GET /api/bookings/:id
 */
exports.getById = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Booking not found");

  // Access control
  if (req.userRole === ROLES.ADMIN) {
    // Admin can see any booking
  } else if (req.userRole === ROLES.OWNER) {
    // Owner can see bookings on their rooms
    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("id, owner_id")
      .eq("id", data.room_id)
      .eq("owner_id", req.user.id)
      .maybeSingle();

    if (!room && data.user_id !== req.user.id) {
      throw ApiError.forbidden("Access denied");
    }
  } else if (data.user_id !== req.user.id) {
    throw ApiError.forbidden("Access denied");
  }

  res.json({ booking: data });
});

/**
 * POST /api/bookings
 * Create a new booking.
 */
exports.create = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const {
    room_id,
    booking_date,
    user_full_name,
    user_phone,
    payment_method,
    total_price,
    price_per_day,
    original_price,
    discount_amount,
    discount_applied,
  } = req.body;

  if (!room_id || !booking_date) {
    throw ApiError.badRequest("room_id and booking_date are required");
  }

  // Check if date is already booked
  const { data: existing } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("room_id", room_id)
    .eq("booking_date", booking_date)
    .in("status", ["pending", "approved", "confirmed", "checked_in"])
    .limit(1);

  if (existing && existing.length > 0) {
    throw ApiError.conflict("This date is already booked for this room");
  }

  const isOnlinePayment = payment_method === "online" && total_price > 0;

  const payload = {
    room_id,
    booking_date,
    user_id: req.user.id,
    user_email: req.user.email || null,
    user_full_name: user_full_name?.trim() || null,
    user_phone: user_phone?.trim() || null,
    total_price: total_price > 0 ? total_price : null,
    price_per_day: price_per_day > 0 ? price_per_day : null,
    status: "pending",
    payment_method: payment_method || "online",
    payment_status: isOnlinePayment ? "pending" : "pay_at_property",
  };

  // Only include discount fields when a discount is actually applied
  if (discount_amount > 0) {
    payload.original_price = original_price > 0 ? original_price : null;
    payload.discount_amount = discount_amount;
    payload.discount_applied = discount_applied || null;
  }

  let { data, error } = await supabaseAdmin
    .from("bookings")
    .insert(payload)
    .select()
    .single();

  // Backward compatibility: some environments don't have discount columns on bookings.
  // If so, retry insert without discount fields instead of failing the booking flow.
  if (
    error &&
    /discount_amount|discount_applied|original_price/i.test(String(error.message || ""))
  ) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.original_price;
    delete fallbackPayload.discount_amount;
    delete fallbackPayload.discount_applied;

    ({ data, error } = await supabaseAdmin
      .from("bookings")
      .insert(fallbackPayload)
      .select()
      .single());
  }

  if (error) throw ApiError.internal(error.message);

  // Notify the room owner about the new booking.
  // If the room belongs to an owner → notify only that owner.
  // If the room belongs to an admin (or has no owner) → notify admins.
  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("owner_id")
    .eq("id", data.room_id)
    .maybeSingle();

  let ownerRole = null;
  if (room?.owner_id) {
    const { data: ownerProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_type")
      .eq("id", room.owner_id)
      .maybeSingle();
    ownerRole = ownerProfile?.user_type || null;
  }

  if (room?.owner_id && ownerRole === ROLES.OWNER) {
    // Room belongs to an owner – notify only the owner
    const ownerNotification = {
      recipient_user_id: room.owner_id,
      type: "booking_created",
      title: "New Booking Request",
      body: `New booking for ${data.booking_date} from ${data.user_email || "a customer"}.`,
      data: { booking_id: data.id, room_id: data.room_id, booking_date: data.booking_date },
      created_at: new Date().toISOString(),
    };

    const { data: savedOwnerNotif } = await supabaseAdmin
      .from("notifications")
      .insert(ownerNotification)
      .select()
      .single();

    emitNotificationToUser(room.owner_id, savedOwnerNotif || ownerNotification);
  } else {
    // Room belongs to admin or has no owner – notify admins
    const adminNotification = {
      recipient_role: "admin",
      type: "booking_created",
      title: "New Booking Request",
      body: `New booking for ${data.booking_date} from ${data.user_email || "a user"}.`,
      data: { booking_id: data.id, room_id: data.room_id, booking_date: data.booking_date },
      created_at: new Date().toISOString(),
    };

    const { data: savedNotif } = await supabaseAdmin
      .from("notifications")
      .insert(adminNotification)
      .select()
      .single();

    emitNotificationToRole("admin", savedNotif || adminNotification);
  }

  syncBookingChange("BOOKING_INSERT", data);

  res.status(201).json({ booking: data });
});

/**
 * PUT /api/bookings/:id
 * Update a booking (admin, owner of the room, or the booking customer).
 */
exports.update = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  // Fetch existing booking to check ownership
  const { data: existingBooking } = await supabaseAdmin
    .from("bookings")
    .select("user_id, room_id, booking_date, user_email, user_full_name")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!existingBooking) throw ApiError.notFound("Booking not found");

  // Access control
  const isAdmin = req.userRole === ROLES.ADMIN;
  const isBookingOwner = existingBooking.user_id === req.user.id;
  let isRoomOwner = false;

  if (req.userRole === ROLES.OWNER) {
    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("id, owner_id")
      .eq("id", existingBooking.room_id)
      .eq("owner_id", req.user.id)
      .maybeSingle();
    isRoomOwner = !!room;
  }

  if (!isAdmin && !isRoomOwner && !isBookingOwner) {
    throw ApiError.forbidden("Access denied");
  }

  const { booking_date, user_full_name, user_phone } = req.body;

  const updates = {};
  if (booking_date !== undefined) updates.booking_date = booking_date;
  if (user_full_name !== undefined) updates.user_full_name = user_full_name?.trim() || null;
  if (user_phone !== undefined) updates.user_phone = user_phone?.trim() || null;

  // When a customer edits their booking, reset status to "pending"
  // so the admin/owner must re-approve it.
  if (!isAdmin && !isRoomOwner) {
    updates.status = "pending";
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  // If customer edited booking details, notify the room owner
  if (!isAdmin && !isRoomOwner) {
    const oldDate = existingBooking.booking_date;
    const newDate = data.booking_date;
    const changedDateText =
      oldDate && newDate && oldDate !== newDate
        ? `Date changed from ${oldDate} to ${newDate}.`
        : `Date: ${newDate || oldDate || "not set"}.`;

    const editedBy =
      data.user_full_name ||
      existingBooking.user_full_name ||
      data.user_email ||
      existingBooking.user_email ||
      "a customer";

    const roomId = data.room_id || existingBooking.room_id;

    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("owner_id")
      .eq("id", roomId)
      .maybeSingle();

    let ownerRole = null;
    if (room?.owner_id) {
      const { data: ownerProfile } = await supabaseAdmin
        .from("profiles")
        .select("user_type")
        .eq("id", room.owner_id)
        .maybeSingle();
      ownerRole = ownerProfile?.user_type || null;
    }

    if (room?.owner_id && ownerRole === ROLES.OWNER) {
      // Room belongs to an owner – notify only the owner
      const ownerNotification = {
        recipient_user_id: room.owner_id,
        type: "booking_updated",
        title: "Booking Updated by Customer",
        body: `${editedBy} updated booking details. ${changedDateText}`,
        data: {
          booking_id: data.id,
          room_id: roomId,
          booking_date: newDate || oldDate,
        },
      };

      const { data: savedOwnerNotif } = await supabaseAdmin
        .from("notifications")
        .insert(ownerNotification)
        .select()
        .single();

      emitNotificationToUser(room.owner_id, savedOwnerNotif || ownerNotification);
    } else {
      // Room belongs to admin or has no owner – notify admins
      const adminNotification = {
        recipient_role: "admin",
        type: "booking_updated",
        title: "Booking Updated by Customer",
        body: `${editedBy} updated booking details. ${changedDateText}`,
        data: {
          booking_id: data.id,
          room_id: roomId,
          booking_date: newDate || oldDate,
        },
      };

      const { data: savedNotif } = await supabaseAdmin
        .from("notifications")
        .insert(adminNotification)
        .select()
        .single();

      emitNotificationToRole("admin", savedNotif || adminNotification);
    }
  }

  syncBookingChange("BOOKING_UPDATE", data, existingBooking);

  res.json({ booking: data });
});

/**
 * PATCH /api/bookings/:id/approve  (admin or room owner)
 */
exports.approve = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ status: "approved" })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Booking not found");

  // Send notification to the user
  const approvedNotif = {
    recipient_user_id: data.user_id,
    type: "booking_approved",
    title: "Booking Confirmed!",
    body: `Your booking for ${data.booking_date} has been approved.`,
    data: {
      booking_id: data.id,
      room_id: data.room_id,
      booking_date: data.booking_date,
    },
  };

  const { data: savedNotif } = await supabaseAdmin
    .from("notifications")
    .insert(approvedNotif)
    .select()
    .single();

  emitNotificationToUser(data.user_id, savedNotif || approvedNotif);

  syncBookingChange("BOOKING_UPDATE", data);

  res.json({ booking: data });
});

/**
 * PATCH /api/bookings/:id/reject  (admin or room owner)
 */
exports.reject = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { reason } = req.body;

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ status: "rejected" })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Booking not found");

  // Send notification to the user
  const reasonText = reason?.trim() ? ` Reason: ${reason.trim()}` : "";
  const rejectedNotif = {
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
    .insert(rejectedNotif)
    .select()
    .single();

  emitNotificationToUser(data.user_id, savedNotif || rejectedNotif);

  syncBookingChange("BOOKING_UPDATE", data);

  res.json({ booking: data });
});

/**
 * DELETE /api/bookings/:id  (admin, room owner, or booking customer)
 * Soft-delete: sets status to "cancelled" instead of removing the row.
 */
exports.remove = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data: existingBooking } = await supabaseAdmin
    .from("bookings")
    .select("id, user_id, room_id, booking_date, user_email, user_full_name, status")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!existingBooking) throw ApiError.notFound("Booking not found");

  if (["cancelled", "checked_out"].includes(existingBooking.status)) {
    throw ApiError.badRequest("This booking is already " + existingBooking.status);
  }

  const isAdmin = req.userRole === ROLES.ADMIN;
  const isBookingOwner = existingBooking.user_id === req.user.id;
  let isRoomOwner = false;

  if (req.userRole === ROLES.OWNER) {
    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("id, owner_id")
      .eq("id", existingBooking.room_id)
      .eq("owner_id", req.user.id)
      .maybeSingle();
    isRoomOwner = !!room;
  }

  if (!isAdmin && !isRoomOwner && !isBookingOwner) {
    throw ApiError.forbidden("Access denied");
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  if (!isAdmin) {
    const cancelledBy =
      existingBooking.user_full_name ||
      existingBooking.user_email ||
      req.user.email ||
      "a customer";

    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("owner_id")
      .eq("id", existingBooking.room_id)
      .maybeSingle();

    let ownerRole = null;
    if (room?.owner_id) {
      const { data: ownerProfile } = await supabaseAdmin
        .from("profiles")
        .select("user_type")
        .eq("id", room.owner_id)
        .maybeSingle();
      ownerRole = ownerProfile?.user_type || null;
    }

    if (room?.owner_id && ownerRole === ROLES.OWNER && room.owner_id !== req.user.id) {
      const ownerNotification = {
        recipient_user_id: room.owner_id,
        type: "booking_cancelled",
        title: "Booking Cancelled",
        body: `${cancelledBy} cancelled booking for ${existingBooking.booking_date}.`,
        data: {
          booking_id: existingBooking.id,
          room_id: existingBooking.room_id,
          booking_date: existingBooking.booking_date,
        },
      };

      const { data: savedOwnerNotif } = await supabaseAdmin
        .from("notifications")
        .insert(ownerNotification)
        .select()
        .single();

      emitNotificationToUser(room.owner_id, savedOwnerNotif || ownerNotification);
    } else if (!room?.owner_id || ownerRole === ROLES.ADMIN) {
      const adminNotification = {
        recipient_role: "admin",
        type: "booking_cancelled",
        title: "Booking Cancelled",
        body: `${cancelledBy} cancelled booking for ${existingBooking.booking_date}.`,
        data: {
          booking_id: existingBooking.id,
          room_id: existingBooking.room_id,
          booking_date: existingBooking.booking_date,
        },
      };

      const { data: savedNotif } = await supabaseAdmin
        .from("notifications")
        .insert(adminNotification)
        .select()
        .single();

      emitNotificationToRole("admin", savedNotif || adminNotification);
    }
  }

  syncBookingChange("BOOKING_UPDATE", data, existingBooking);

  res.json({ message: "Booking cancelled successfully", booking: data });
});

/**
 * PATCH /api/bookings/:id/check-in  (admin or room owner)
 */
exports.checkIn = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!booking) throw ApiError.notFound("Booking not found");

  if (!["approved", "confirmed"].includes(booking.status)) {
    throw ApiError.badRequest(`Cannot check in a booking with status "${booking.status}". Must be approved or confirmed.`);
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

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

  syncBookingChange("BOOKING_UPDATE", data);

  res.json({ booking: data });
});

/**
 * PATCH /api/bookings/:id/check-out  (admin or room owner)
 */
exports.checkOut = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!booking) throw ApiError.notFound("Booking not found");

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

  syncBookingChange("BOOKING_UPDATE", data);

  res.json({ booking: data });
});

/**
 * GET /api/bookings/today
 * Returns today's bookings (approved/confirmed/checked_in) for check-in/check-out management.
 * Admin: bookings on admin-owned rooms (no owner or admin is owner).
 * Owner: bookings on their rooms.
 */
exports.getTodayBookings = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  let roomIds = [];

  if (req.userRole === ROLES.ADMIN) {
    const { data: adminRooms } = await supabaseAdmin
      .from("rooms")
      .select("id, owner_id");

    roomIds = (adminRooms || [])
      .filter((r) => !r.owner_id || r.owner_id === req.user.id)
      .map((r) => r.id);
  } else if (req.userRole === ROLES.OWNER) {
    const ownerId = req.impersonating ? req.effectiveUserId : req.user.id;
    const { data: ownerRooms } = await supabaseAdmin
      .from("rooms")
      .select("id")
      .eq("owner_id", ownerId);

    roomIds = (ownerRooms || []).map((r) => r.id);
  }

  if (roomIds.length === 0) {
    return res.json({ bookings: [], total: 0 });
  }

  const { data, error, count } = await supabaseAdmin
    .from("bookings")
    .select("*", { count: "exact" })
    .eq("booking_date", today)
    .in("room_id", roomIds)
    .in("status", ["approved", "confirmed", "checked_in"])
    .order("created_at", { ascending: true });

  if (error) throw ApiError.internal(error.message);

  const roomIdsInBookings = [...new Set((data || []).map((b) => b.room_id))];
  let roomsMap = {};
  if (roomIdsInBookings.length > 0) {
    const { data: rooms } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .in("id", roomIdsInBookings);
    (rooms || []).forEach((r) => { roomsMap[r.id] = r; });
  }

  const bookingsWithRoom = (data || []).map((b) => ({
    ...b,
    room: roomsMap[b.room_id] || null,
  }));

  res.json({ bookings: bookingsWithRoom, total: count });
});

/**
 * GET /api/bookings/history
 * Returns booking history categorized by tab: no_show, completed, rejected, cancelled.
 * Query params: tab (required), limit, offset
 */
exports.getBookingHistory = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { tab, limit = 50, offset = 0 } = req.query;

  if (!tab || !["no_show", "completed", "rejected", "cancelled"].includes(tab)) {
    throw ApiError.badRequest("tab query parameter is required: no_show, completed, rejected, cancelled");
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  let roomIds = [];

  if (req.userRole === ROLES.ADMIN) {
    const { data: adminRooms } = await supabaseAdmin
      .from("rooms")
      .select("id, owner_id");

    roomIds = (adminRooms || [])
      .filter((r) => !r.owner_id || r.owner_id === req.user.id)
      .map((r) => r.id);
  } else if (req.userRole === ROLES.OWNER) {
    const ownerId = req.impersonating ? req.effectiveUserId : req.user.id;
    const { data: ownerRooms } = await supabaseAdmin
      .from("rooms")
      .select("id")
      .eq("owner_id", ownerId);

    roomIds = (ownerRooms || []).map((r) => r.id);
  }

  if (roomIds.length === 0) {
    return res.json({ bookings: [], total: 0 });
  }

  let query = supabaseAdmin
    .from("bookings")
    .select("*", { count: "exact" })
    .in("room_id", roomIds)
    .order("booking_date", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  switch (tab) {
    case "no_show":
      // Past bookings that were approved/confirmed but never checked in,
      // OR past bookings still pending (admin never reviewed)
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

  const roomIdsInBookings = [...new Set((data || []).map((b) => b.room_id))];
  let roomsMap = {};
  if (roomIdsInBookings.length > 0) {
    const { data: rooms } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .in("id", roomIdsInBookings);
    (rooms || []).forEach((r) => { roomsMap[r.id] = r; });
  }

  const bookingsWithRoom = (data || []).map((b) => ({
    ...b,
    room: roomsMap[b.room_id] || null,
  }));

  res.json({ bookings: bookingsWithRoom, total: count });
});

/**
 * GET /api/bookings/availability/:roomId
 * Check which dates are booked for a given room.
 */
exports.getAvailability = asyncHandler(async (req, res) => {
  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabase
    .from("bookings")
    .select("booking_date, status")
    .eq("room_id", req.params.roomId)
    .in("status", ["pending", "approved", "confirmed", "checked_in"]);

  if (error) throw ApiError.internal(error.message);

  const bookedDates = (data || []).map((b) => b.booking_date);

  res.json({ booked_dates: bookedDates });
});

/**
 * GET /api/bookings/booked-rooms?date=YYYY-MM-DD
 * Returns an array of room IDs that are booked on the given date.
 */
exports.getBookedRoomsByDate = asyncHandler(async (req, res) => {
  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const { date } = req.query;
  if (!date) throw ApiError.badRequest("date query parameter is required");

  const { data, error } = await supabase
    .from("bookings")
    .select("room_id")
    .eq("booking_date", date)
    .in("status", ["pending", "approved", "confirmed", "checked_in"]);

  if (error) throw ApiError.internal(error.message);

  const roomIds = [...new Set((data || []).map((b) => b.room_id))];

  res.json({ booked_room_ids: roomIds });
});
