const { supabase, supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/**
 * GET /api/rooms
 * List all rooms. Supports optional query params:
 *   ?type=suite&search=ocean&limit=20&offset=0&owner_id=xxx
 */
exports.getAll = asyncHandler(async (req, res) => {
  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const {
    type,
    search,
    guests,
    min_price,
    max_price,
    date,
    sort,
    owner_id,
    limit = 50,
    offset = 0,
  } = req.query;

  let query = supabase
    .from("rooms")
    .select("*", { count: "exact" });

  if (type) {
    query = query.eq("type", type);
  }

  // Filter by owner if specified
  if (owner_id) {
    query = query.eq("owner_id", owner_id);
  }

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,location.ilike.%${search}%`
    );
  }

  const parsedGuests = Number(guests);
  if (Number.isFinite(parsedGuests) && parsedGuests > 0) {
    query = query.gte("guests", parsedGuests);
  }

  const parsedMinPrice = Number(min_price);
  if (Number.isFinite(parsedMinPrice) && parsedMinPrice >= 0) {
    query = query.gte("price_per_day", parsedMinPrice);
  }

  const parsedMaxPrice = Number(max_price);
  if (Number.isFinite(parsedMaxPrice) && parsedMaxPrice >= 0) {
    query = query.lte("price_per_day", parsedMaxPrice);
  }

  if (date) {
    const { data: bookedRows, error: bookedError } = await supabase
      .from("bookings")
      .select("room_id")
      .eq("booking_date", date)
      .in("status", ["pending", "approved", "confirmed"]);

    if (bookedError) throw ApiError.internal(bookedError.message);

    const bookedRoomIds = [...new Set((bookedRows || []).map((row) => row.room_id).filter(Boolean))];

    if (bookedRoomIds.length > 0) {
      const excludedIds = bookedRoomIds.map((id) => `"${String(id).replace(/"/g, "")}"`).join(",");
      query = query.not("id", "in", `(${excludedIds})`);
    }
  }

  // Sorting – supports price_asc, price_desc; default is newest first
  if (sort === "price_asc") {
    query = query.order("price_per_day", { ascending: true });
  } else if (sort === "price_desc") {
    query = query.order("price_per_day", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  res.json({ rooms: data, total: count });
});

/**
 * GET /api/rooms/:id
 * Get a single room by ID.
 */
exports.getById = asyncHandler(async (req, res) => {
  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Room not found");

  res.json({ room: data });
});

/**
 * POST /api/rooms  (admin only)
 * Create a new room. Admin can optionally assign an owner_id.
 */
exports.create = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase admin client is not configured");

  const { title, location, type, guests, price_per_day, image, tags, owner_id } = req.body;

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
    owner_id: owner_id || null,
  };

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .insert([roomData])
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  res.status(201).json({ room: data });
});

/**
 * PUT /api/rooms/:id  (admin only)
 * Update a room. Admin can update any room.
 */
exports.update = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase admin client is not configured");

  const { title, location, type, guests, price_per_day, image, tags, owner_id } = req.body;

  const updates = {};
  if (title !== undefined) updates.title = title.trim();
  if (location !== undefined) updates.location = location.trim();
  if (type !== undefined) updates.type = type;
  if (guests !== undefined) updates.guests = Number(guests);
  if (price_per_day !== undefined) updates.price_per_day = Number(price_per_day);
  if (image !== undefined) updates.image = image || null;
  if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
  if (owner_id !== undefined) updates.owner_id = owner_id || null;

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Room not found");

  res.json({ room: data });
});

/**
 * DELETE /api/rooms/:id  (admin only)
 * Delete a room.
 */
exports.remove = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase admin client is not configured");

  const { error } = await supabaseAdmin
    .from("rooms")
    .delete()
    .eq("id", req.params.id);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "Room deleted successfully" });
});
