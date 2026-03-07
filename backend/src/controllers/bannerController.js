const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/**
 * GET /api/banners
 * Public – returns active banners ordered by sort_order.
 */
exports.getActiveBanners = asyncHandler(async (_req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw ApiError.internal(error.message);
  res.json({ banners: data || [] });
});

/**
 * GET /api/admin/banners
 * Admin – returns ALL banners (active + inactive).
 */
exports.getAllBanners = asyncHandler(async (_req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw ApiError.internal(error.message);
  res.json({ banners: data || [] });
});

/**
 * POST /api/admin/banners
 * Admin – create a new banner.
 */
exports.createBanner = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const {
    title, subtitle, cta_text, cta_link,
    bg_type, bg_image_url, bg_color, bg_gradient, bg_opacity,
    text_box_x, text_box_y, text_box_width, text_color,
    sort_order, is_active,
  } = req.body;

  const { count } = await supabaseAdmin
    .from("banners")
    .select("id", { count: "exact", head: true });

  const row = {
    title: title || null,
    subtitle: subtitle || null,
    cta_text: cta_text || null,
    cta_link: cta_link || null,
    bg_type: bg_type || "color",
    bg_image_url: bg_image_url || null,
    bg_color: bg_color || "#4f46e5",
    bg_gradient: bg_gradient || "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    bg_opacity: bg_opacity ?? 1.0,
    text_box_x: text_box_x ?? 5,
    text_box_y: text_box_y ?? 25,
    text_box_width: text_box_width ?? 45,
    text_color: text_color || "#ffffff",
    sort_order: sort_order ?? (count || 0),
    is_active: is_active ?? true,
  };

  const { data, error } = await supabaseAdmin
    .from("banners")
    .insert(row)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  res.status(201).json({ banner: data });
});

/**
 * PUT /api/admin/banners/:id
 * Admin – update a banner.
 */
exports.updateBanner = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const allowed = [
    "title", "subtitle", "cta_text", "cta_link",
    "bg_type", "bg_image_url", "bg_color", "bg_gradient", "bg_opacity",
    "text_box_x", "text_box_y", "text_box_width", "text_color",
    "sort_order", "is_active",
  ];

  const updates = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabaseAdmin
    .from("banners")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Banner not found");

  res.json({ banner: data });
});

/**
 * DELETE /api/admin/banners/:id
 * Admin – delete a banner.
 */
exports.deleteBanner = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { error } = await supabaseAdmin
    .from("banners")
    .delete()
    .eq("id", req.params.id);

  if (error) throw ApiError.internal(error.message);
  res.json({ message: "Banner deleted" });
});

/**
 * PUT /api/admin/banners/reorder
 * Admin – bulk-update sort_order. Body: { order: [{ id, sort_order }] }
 */
exports.reorderBanners = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { order } = req.body;
  if (!Array.isArray(order)) throw ApiError.badRequest("`order` must be an array");

  for (const { id, sort_order } of order) {
    const { error } = await supabaseAdmin
      .from("banners")
      .update({ sort_order, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw ApiError.internal(error.message);
  }

  res.json({ message: "Banners reordered" });
});
