const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

// ─── Helpers ──────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function activeFilter(query) {
  const today = todayISO();
  return query
    .eq("is_active", true)
    .lte("start_date", today)
    .gte("end_date", today);
}

// ══════════════════════════════════════════════════════════════
// ADMIN endpoints
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/offers              (public – active offers for guest UI)
 * GET /api/admin/offers        (admin – all offers, including expired)
 */
exports.getAllAdmin = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { active_only, room_id, owner_id, limit = 100, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from("offers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (active_only === "true") query = activeFilter(query);
  if (room_id) query = query.eq("room_id", room_id);
  if (owner_id) query = query.eq("owner_id", owner_id);

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  res.json({ offers: data, total: count });
});

/**
 * POST /api/admin/offers
 */
exports.createAdmin = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const {
    title, description, tag_label,
    discount_type, discount_value,
    banner_image, show_banner,
    room_id, owner_id,
    start_date, end_date,
  } = req.body;

  if (!title) throw ApiError.badRequest("Title is required");
  if (!end_date) throw ApiError.badRequest("End date is required");

  const offerData = {
    title: title.trim(),
    description: description?.trim() || null,
    tag_label: tag_label?.trim() || null,
    discount_type: discount_type || "percentage",
    discount_value: Number(discount_value) || 0,
    banner_image: banner_image?.trim() || null,
    show_banner: !!show_banner,
    room_id: room_id || null,
    owner_id: owner_id || null,
    created_by: req.user.id,
    start_date: start_date || todayISO(),
    end_date,
    is_active: true,
  };

  const { data, error } = await supabaseAdmin
    .from("offers")
    .insert([offerData])
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  res.status(201).json({ offer: data });
});

/**
 * PUT /api/admin/offers/:id
 */
exports.updateAdmin = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const {
    title, description, tag_label,
    discount_type, discount_value,
    banner_image, show_banner,
    room_id, owner_id,
    start_date, end_date,
    is_active,
  } = req.body;

  const updates = {};
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (tag_label !== undefined) updates.tag_label = tag_label?.trim() || null;
  if (discount_type !== undefined) updates.discount_type = discount_type;
  if (discount_value !== undefined) updates.discount_value = Number(discount_value);
  if (banner_image !== undefined) updates.banner_image = banner_image?.trim() || null;
  if (show_banner !== undefined) updates.show_banner = !!show_banner;
  if (room_id !== undefined) updates.room_id = room_id || null;
  if (owner_id !== undefined) updates.owner_id = owner_id || null;
  if (start_date !== undefined) updates.start_date = start_date;
  if (end_date !== undefined) updates.end_date = end_date;
  if (is_active !== undefined) updates.is_active = !!is_active;

  const { data, error } = await supabaseAdmin
    .from("offers")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Offer not found");

  res.json({ offer: data });
});

/**
 * DELETE /api/admin/offers/:id
 */
exports.deleteAdmin = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { error } = await supabaseAdmin
    .from("offers")
    .delete()
    .eq("id", req.params.id);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "Offer deleted successfully" });
});

// ══════════════════════════════════════════════════════════════
// OWNER endpoints — scoped to the effective owner
// ══════════════════════════════════════════════════════════════

function resolveOwnerId(req) {
  const { ROLES } = require("../middleware/rbac");
  if (req.impersonating && req.effectiveRole === ROLES.OWNER) return req.effectiveUserId;
  if (req.userRole === ROLES.OWNER) return req.user.id;
  return null;
}

/**
 * GET /api/owner/offers
 */
exports.getAllOwner = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { active_only, limit = 100, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from("offers")
    .select("*", { count: "exact" })
    .eq("created_by", ownerId)
    .order("created_at", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (active_only === "true") query = activeFilter(query);

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  res.json({ offers: data, total: count });
});

/**
 * POST /api/owner/offers
 * Owners can create offers only for their own rooms.
 */
exports.createOwner = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const {
    title, description, tag_label,
    discount_type, discount_value,
    room_id,
    start_date, end_date,
  } = req.body;

  if (!title) throw ApiError.badRequest("Title is required");
  if (!end_date) throw ApiError.badRequest("End date is required");

  // If a specific room_id is provided, verify the owner owns it
  if (room_id) {
    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("id")
      .eq("id", room_id)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (!room) throw ApiError.forbidden("You don't own this room");
  }

  const offerData = {
    title: title.trim(),
    description: description?.trim() || null,
    tag_label: tag_label?.trim() || null,
    discount_type: discount_type || "percentage",
    discount_value: Number(discount_value) || 0,
    banner_image: null,
    show_banner: false,
    room_id: room_id || null,
    owner_id: ownerId,
    created_by: ownerId,
    start_date: start_date || todayISO(),
    end_date,
    is_active: true,
  };

  const { data, error } = await supabaseAdmin
    .from("offers")
    .insert([offerData])
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  res.status(201).json({ offer: data });
});

/**
 * PUT /api/owner/offers/:id
 */
exports.updateOwner = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const {
    title, description, tag_label,
    discount_type, discount_value,
    room_id,
    start_date, end_date,
    is_active,
  } = req.body;

  // Verify owner owns this room if switching room_id
  if (room_id) {
    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("id")
      .eq("id", room_id)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (!room) throw ApiError.forbidden("You don't own this room");
  }

  const updates = {};
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (tag_label !== undefined) updates.tag_label = tag_label?.trim() || null;
  if (discount_type !== undefined) updates.discount_type = discount_type;
  if (discount_value !== undefined) updates.discount_value = Number(discount_value);
  if (room_id !== undefined) updates.room_id = room_id || null;
  if (start_date !== undefined) updates.start_date = start_date;
  if (end_date !== undefined) updates.end_date = end_date;
  if (is_active !== undefined) updates.is_active = !!is_active;

  const { data, error } = await supabaseAdmin
    .from("offers")
    .update(updates)
    .eq("id", req.params.id)
    .eq("created_by", ownerId)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Offer not found or you don't own it");

  res.json({ offer: data });
});

/**
 * DELETE /api/owner/offers/:id
 */
exports.deleteOwner = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const ownerId = resolveOwnerId(req);
  if (!ownerId) throw ApiError.forbidden("Owner context required");

  const { error } = await supabaseAdmin
    .from("offers")
    .delete()
    .eq("id", req.params.id)
    .eq("created_by", ownerId);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "Offer deleted successfully" });
});

// ══════════════════════════════════════════════════════════════
// PUBLIC endpoints — for guest-facing UI
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/offers/active
 * Returns all currently active offers (for badge display on listings).
 */
exports.getActiveOffers = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  let query = supabaseAdmin
    .from("offers")
    .select("*")
    .order("created_at", { ascending: false });

  query = activeFilter(query);

  const { data, error } = await query;
  if (error) throw ApiError.internal(error.message);

  res.json({ offers: data });
});

/**
 * GET /api/offers/banners
 * Returns active offers with show_banner=true for the landing page campaign banner.
 */
exports.getBanners = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  let query = supabaseAdmin
    .from("offers")
    .select("*")
    .eq("show_banner", true)
    .order("created_at", { ascending: false });

  query = activeFilter(query);

  const { data, error } = await query;
  if (error) throw ApiError.internal(error.message);

  res.json({ banners: data });
});

/**
 * GET /api/offers/room/:roomId
 * Returns the best active offer for a specific room (used on the Booking page).
 */
exports.getOfferForRoom = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { roomId } = req.params;

  // First look for a room-specific offer
  const today = todayISO();
  const { data: roomOffer } = await supabaseAdmin
    .from("offers")
    .select("*")
    .eq("room_id", roomId)
    .eq("is_active", true)
    .lte("start_date", today)
    .gte("end_date", today)
    .order("discount_value", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (roomOffer) {
    return res.json({ offer: roomOffer });
  }

  // Otherwise check for an owner-level offer on this room's owner
  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("owner_id")
    .eq("id", roomId)
    .maybeSingle();

  if (room?.owner_id) {
    const { data: ownerOffer } = await supabaseAdmin
      .from("offers")
      .select("*")
      .eq("owner_id", room.owner_id)
      .is("room_id", null)
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("discount_value", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ownerOffer) {
      return res.json({ offer: ownerOffer });
    }
  }

  // Check for site-wide offers (no room_id, no owner_id)
  const { data: siteOffer } = await supabaseAdmin
    .from("offers")
    .select("*")
    .is("room_id", null)
    .is("owner_id", null)
    .eq("is_active", true)
    .lte("start_date", today)
    .gte("end_date", today)
    .order("discount_value", { ascending: false })
    .limit(1)
    .maybeSingle();

  res.json({ offer: siteOffer || null });
});
