const { supabase, supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/**
 * GET /api/bookings
 * Admin: returns all bookings.
 * Regular user: returns only their own bookings.
 */
exports.getAll = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { status, room_id, limit = 50, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from("bookings")
    .select("*", { count: "exact" })
    .order("booking_date", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  // Non-admin users can only see their own bookings
  if (req.userRole !== "admin") {
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

  // Non-admin users can only see their own bookings
  if (req.userRole !== "admin" && data.user_id !== req.user.id) {
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
    original_price: original_price > 0 ? original_price : null,
    discount_amount: discount_amount > 0 ? discount_amount : null,
    discount_applied: discount_applied || null,
    status: "pending",
    payment_method: payment_method || "online",
    payment_status: isOnlinePayment ? "pending" : "pay_at_property",
  };

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert(payload)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  res.status(201).json({ booking: data });
});

/**
 * PUT /api/bookings/:id
 * Update a booking (admin or owner).
 */
exports.update = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  // Fetch existing booking to check ownership
  const { data: existingBooking } = await supabaseAdmin
    .from("bookings")
    .select("user_id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!existingBooking) throw ApiError.notFound("Booking not found");

  if (req.userRole !== "admin" && existingBooking.user_id !== req.user.id) {
    throw ApiError.forbidden("Access denied");
  }

  const { booking_date, user_full_name, user_phone, total_price, price_per_day } =
    req.body;

  const updates = {};
  if (booking_date !== undefined) updates.booking_date = booking_date;
  if (user_full_name !== undefined) updates.user_full_name = user_full_name?.trim() || null;
  if (user_phone !== undefined) updates.user_phone = user_phone?.trim() || null;
  if (total_price !== undefined) updates.total_price = total_price;
  if (price_per_day !== undefined) updates.price_per_day = price_per_day;

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  res.json({ booking: data });
});

/**
 * PATCH /api/bookings/:id/approve  (admin only)
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
  await supabaseAdmin.from("notifications").insert({
    recipient_user_id: data.user_id,
    type: "booking_approved",
    title: "Booking Confirmed!",
    body: `Your booking for ${data.booking_date} has been approved.`,
    data: {
      booking_id: data.id,
      room_id: data.room_id,
      booking_date: data.booking_date,
    },
  });

  res.json({ booking: data });
});

/**
 * PATCH /api/bookings/:id/reject  (admin only)
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
  await supabaseAdmin.from("notifications").insert({
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
  });

  res.json({ booking: data });
});

/**
 * DELETE /api/bookings/:id  (admin or owner)
 */
exports.remove = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  // Check ownership
  const { data: existingBooking } = await supabaseAdmin
    .from("bookings")
    .select("user_id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!existingBooking) throw ApiError.notFound("Booking not found");

  if (req.userRole !== "admin" && existingBooking.user_id !== req.user.id) {
    throw ApiError.forbidden("Access denied");
  }

  const { error } = await supabaseAdmin
    .from("bookings")
    .delete()
    .eq("id", req.params.id);

  if (error) throw ApiError.internal(error.message);

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
