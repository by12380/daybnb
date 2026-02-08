const { supabase, supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/**
 * GET /api/rooms
 * List all rooms. Supports optional query params:
 *   ?type=suite&search=ocean&limit=20&offset=0
 */
exports.getAll = asyncHandler(async (req, res) => {
  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const { type, search, limit = 50, offset = 0 } = req.query;

  let query = supabase
    .from("rooms")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (type) {
    query = query.eq("type", type);
  }

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
 * Create a new room.
 */
exports.create = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase admin client is not configured");

  const { title, location, type, guests, price_per_day, image, tags } = req.body;

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
 * Update a room.
 */
exports.update = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase admin client is not configured");

  const { title, location, type, guests, price_per_day, image, tags } = req.body;

  const updates = {};
  if (title !== undefined) updates.title = title.trim();
  if (location !== undefined) updates.location = location.trim();
  if (type !== undefined) updates.type = type;
  if (guests !== undefined) updates.guests = Number(guests);
  if (price_per_day !== undefined) updates.price_per_day = Number(price_per_day);
  if (image !== undefined) updates.image = image || null;
  if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];

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
