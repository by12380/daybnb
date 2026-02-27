const { supabase, supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { syncRoomInsert, syncRoomUpdate, syncRoomDelete } = require("../utils/algoliaSync");

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
    property_type,
    place_type,
    min_beds,
    min_bathrooms,
    instant_book,
    self_checkin,
    allows_pets,
    is_guest_favorite,
    is_luxe,
    amenities,
    safety_features,
    limit = 50,
    offset = 0,
  } = req.query;

  let query = supabase
    .from("rooms")
    .select("*", { count: "exact" });

  if (type) {
    query = query.eq("type", type);
  }

  if (owner_id) {
    query = query.eq("owner_id", owner_id);
  }

  if (property_type) {
    const ptList = property_type.split(",").map((s) => s.trim()).filter(Boolean);
    if (ptList.length === 1) query = query.eq("property_type", ptList[0]);
    else if (ptList.length > 1) query = query.in("property_type", ptList);
  }
  if (place_type && place_type !== "any") query = query.eq("place_type", place_type);

  const parsedMinBeds = Number(min_beds);
  if (Number.isFinite(parsedMinBeds) && parsedMinBeds > 0) query = query.gte("beds", parsedMinBeds);

  const parsedMinBathrooms = Number(min_bathrooms);
  if (Number.isFinite(parsedMinBathrooms) && parsedMinBathrooms > 0) query = query.gte("bathrooms", parsedMinBathrooms);

  if (instant_book === "true") query = query.eq("instant_book", true);
  if (self_checkin === "true") query = query.eq("self_checkin", true);
  if (allows_pets === "true") query = query.eq("allows_pets", true);
  if (is_guest_favorite === "true") query = query.eq("is_guest_favorite", true);
  if (is_luxe === "true") query = query.eq("is_luxe", true);

  if (amenities) {
    const amenityList = Array.isArray(amenities) ? amenities : amenities.split(",");
    query = query.contains("amenities", amenityList);
  }

  if (safety_features) {
    const safetyList = Array.isArray(safety_features) ? safety_features : safety_features.split(",");
    query = query.contains("safety_features", safetyList);
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

  const {
    title, location, type, guests, price_per_day, image, tags, owner_id,
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
    owner_id: owner_id || null,
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
 * PUT /api/rooms/:id  (admin only)
 * Update a room. Admin can update any room.
 */
exports.update = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase admin client is not configured");

  const {
    title, location, type, guests, price_per_day, image, tags, owner_id,
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
  if (owner_id !== undefined) updates.owner_id = owner_id || null;
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
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Room not found");

  syncRoomUpdate(data);

  res.json({ room: data });
});

/**
 * DELETE /api/rooms/:id  (admin only)
 * Delete a room.
 */
exports.remove = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase admin client is not configured");

  const deletedId = req.params.id;

  const { error } = await supabaseAdmin
    .from("rooms")
    .delete()
    .eq("id", deletedId);

  if (error) throw ApiError.internal(error.message);

  syncRoomDelete(deletedId);

  res.json({ message: "Room deleted successfully" });
});
