const { supabase, supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const {
  PROPERTY_TYPES,
  PLACE_TYPES,
  BOOKING_OPTIONS,
  STANDOUT_STAYS,
  parseStringList,
  toBoolean,
  sanitizeAmenities,
} = require("../utils/roomFilters");

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
    property_type,
    place_type,
    instant_book,
    self_checkin,
    allows_pets,
    is_guest_favorite,
    is_luxe,
    amenities,
    safety_features,
    booking_options,
    standout,
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

  const propertyTypeFilter = String(property_type || "").trim().toLowerCase();
  if (propertyTypeFilter && PROPERTY_TYPES.includes(propertyTypeFilter)) {
    query = query.eq("property_type", propertyTypeFilter);
  }

  const placeTypeFilter = String(place_type || "").trim().toLowerCase();
  if (placeTypeFilter && placeTypeFilter !== "any") {
    query = query.eq("place_type", placeTypeFilter);
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

  const bookingOptionFilters = parseStringList(booking_options).filter((value) =>
    BOOKING_OPTIONS.includes(value)
  );
  bookingOptionFilters.forEach((field) => {
    query = query.eq(field, true);
  });

  const standoutMap = {
    guest_favorite: "is_guest_favorite",
    luxe: "is_luxe",
    is_guest_favorite: "is_guest_favorite",
    is_luxe: "is_luxe",
  };
  const standoutFilters = parseStringList(standout)
    .map((value) => standoutMap[value])
    .filter(Boolean);
  standoutFilters.forEach((field) => {
    if (STANDOUT_STAYS.includes(field)) {
      query = query.eq(field, true);
    }
  });

  if (instant_book !== undefined) {
    query = query.eq("instant_book", toBoolean(instant_book));
  }
  if (self_checkin !== undefined) {
    query = query.eq("self_checkin", toBoolean(self_checkin));
  }
  if (allows_pets !== undefined) {
    query = query.eq("allows_pets", toBoolean(allows_pets));
  }
  if (is_guest_favorite !== undefined) {
    query = query.eq("is_guest_favorite", toBoolean(is_guest_favorite));
  }
  if (is_luxe !== undefined) {
    query = query.eq("is_luxe", toBoolean(is_luxe));
  }

  const amenityFilters = parseStringList(amenities);
  if (amenityFilters.length > 0) {
    query = query.contains("amenities", amenityFilters);
  }

  const safetyFilters = parseStringList(safety_features);
  if (safetyFilters.length > 0) {
    query = query.contains("safety_features", safetyFilters);
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
  const { owner_id } = req.body;
  const roomData = normalizeRoomPayload(req.body, { partial: false });
  roomData.id = require("crypto").randomUUID();
  roomData.owner_id = owner_id || null;

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
  const updates = normalizeRoomPayload(req.body, { partial: true });
  if (req.body.owner_id !== undefined) updates.owner_id = req.body.owner_id || null;

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
