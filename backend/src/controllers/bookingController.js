const { supabase, supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../middleware/rbac");
const { emitNotificationToUser, emitNotificationToRole } = require("../socket");

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
    .in("status", ["pending", "approved", "confirmed"])
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

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert(payload)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  // Notify admins about the new booking via socket
  const adminNotification = {
    recipient_role: "admin",
    type: "booking_created",
    title: "New Booking Request",
    body: `New booking for ${data.booking_date} from ${data.user_email || "a user"}.`,
    data: { booking_id: data.id, room_id: data.room_id, booking_date: data.booking_date },
    created_at: new Date().toISOString(),
  };

  // Save to DB
  const { data: savedNotif } = await supabaseAdmin
    .from("notifications")
    .insert(adminNotification)
    .select()
    .single();

  // Push via socket to all connected admins
  emitNotificationToRole("admin", savedNotif || adminNotification);

  // Also notify the room owner if the room has one
  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("owner_id")
    .eq("id", data.room_id)
    .maybeSingle();

  if (room?.owner_id) {
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
  }

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

  // If customer edited booking details, re-notify admins and room owner
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

    const adminNotification = {
      recipient_role: "admin",
      type: "booking_updated",
      title: "Booking Updated by Customer",
      body: `${editedBy} updated booking details. ${changedDateText}`,
      data: {
        booking_id: data.id,
        room_id: data.room_id || existingBooking.room_id,
        booking_date: newDate || oldDate,
      },
    };

    const { data: savedNotif } = await supabaseAdmin
      .from("notifications")
      .insert(adminNotification)
      .select()
      .single();

    emitNotificationToRole("admin", savedNotif || adminNotification);

    // Also notify room owner
    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("owner_id")
      .eq("id", data.room_id || existingBooking.room_id)
      .maybeSingle();

    if (room?.owner_id) {
      const ownerNotification = {
        recipient_user_id: room.owner_id,
        type: "booking_updated",
        title: "Booking Updated by Customer",
        body: `${editedBy} updated booking details. ${changedDateText}`,
        data: {
          booking_id: data.id,
          room_id: data.room_id || existingBooking.room_id,
          booking_date: newDate || oldDate,
        },
      };

      const { data: savedOwnerNotif } = await supabaseAdmin
        .from("notifications")
        .insert(ownerNotification)
        .select()
        .single();

      emitNotificationToUser(room.owner_id, savedOwnerNotif || ownerNotification);
    }
  }

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

  res.json({ booking: data });
});

/**
 * DELETE /api/bookings/:id  (admin, room owner, or booking customer)
 */
exports.remove = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  // Check ownership
  const { data: existingBooking } = await supabaseAdmin
    .from("bookings")
    .select("id, user_id, room_id, booking_date, user_email, user_full_name")
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

  const { error } = await supabaseAdmin
    .from("bookings")
    .delete()
    .eq("id", req.params.id);

  if (error) throw ApiError.internal(error.message);

  // Notify admins when a customer cancels booking.
  if (!isAdmin) {
    const cancelledBy =
      existingBooking.user_full_name ||
      existingBooking.user_email ||
      req.user.email ||
      "a customer";

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

    // Also notify room owner
    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("owner_id")
      .eq("id", existingBooking.room_id)
      .maybeSingle();

    if (room?.owner_id && room.owner_id !== req.user.id) {
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
    }
  }

  res.json({ message: "Booking deleted successfully" });
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
    .in("status", ["pending", "approved", "confirmed"]);

  if (error) throw ApiError.internal(error.message);

  const bookedDates = (data || []).map((b) => b.booking_date);

  res.json({ booked_dates: bookedDates });
});

/**
 * GET /api/bookings/booked-rooms?date=YYYY-MM-DD
 * Returns an array of room IDs that are booked on the given date
 * (status: pending, approved, or confirmed).
 */
exports.getBookedRoomsByDate = asyncHandler(async (req, res) => {
  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const { date } = req.query;
  if (!date) throw ApiError.badRequest("date query parameter is required");

  const { data, error } = await supabase
    .from("bookings")
    .select("room_id")
    .eq("booking_date", date)
    .in("status", ["pending", "approved", "confirmed"]);

  if (error) throw ApiError.internal(error.message);

  const roomIds = [...new Set((data || []).map((b) => b.room_id))];

  res.json({ booked_room_ids: roomIds });
});
