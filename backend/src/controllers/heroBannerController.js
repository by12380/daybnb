const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

const VALID_BACKGROUND_TYPES = new Set(["image", "solid", "gradient"]);
const VALID_TEXT_ALIGNMENTS = new Set(["left", "center", "right"]);
const VALID_GRADIENT_DIRECTIONS = new Set([
  "to-r",
  "to-l",
  "to-b",
  "to-t",
  "to-tr",
  "to-tl",
  "to-br",
  "to-bl",
]);

function toNullableText(value) {
  if (value === undefined) return undefined;
  const next = typeof value === "string" ? value.trim() : "";
  return next || null;
}

function toClampedNumber(value, { min, max, fallback, integer = false }) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const clamped = Math.min(max, Math.max(min, parsed));
  return integer ? Math.round(clamped) : Number(clamped.toFixed(2));
}

function normalizePayload(body, { partial = false, existingBanner = null } = {}) {
  const payload = {};

  if (!partial || body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) throw ApiError.badRequest("Title is required");
    payload.title = title;
  }

  if (!partial || body.subtitle !== undefined) {
    payload.subtitle = toNullableText(body.subtitle) ?? null;
  }

  if (!partial || body.badge_text !== undefined) {
    payload.badge_text = toNullableText(body.badge_text) ?? null;
  }

  if (!partial || body.cta_text !== undefined) {
    payload.cta_text = toNullableText(body.cta_text) ?? null;
  }

  if (!partial || body.cta_link !== undefined) {
    payload.cta_link = toNullableText(body.cta_link) ?? null;
  }

  if (!partial || body.background_type !== undefined) {
    const backgroundType = body.background_type || "image";
    if (!VALID_BACKGROUND_TYPES.has(backgroundType)) {
      throw ApiError.badRequest("Invalid background type");
    }
    payload.background_type = backgroundType;
  }

  if (!partial || body.background_image !== undefined) {
    payload.background_image = toNullableText(body.background_image) ?? null;
  }

  if (!partial || body.background_color !== undefined) {
    payload.background_color = toNullableText(body.background_color) ?? "#2563eb";
  }

  if (!partial || body.gradient_from !== undefined) {
    payload.gradient_from = toNullableText(body.gradient_from) ?? "#2563eb";
  }

  if (!partial || body.gradient_to !== undefined) {
    payload.gradient_to = toNullableText(body.gradient_to) ?? "#7c3aed";
  }

  if (!partial || body.gradient_direction !== undefined) {
    const gradientDirection = body.gradient_direction || "to-r";
    if (!VALID_GRADIENT_DIRECTIONS.has(gradientDirection)) {
      throw ApiError.badRequest("Invalid gradient direction");
    }
    payload.gradient_direction = gradientDirection;
  }

  if (!partial || body.background_opacity !== undefined) {
    payload.background_opacity = toClampedNumber(body.background_opacity, {
      min: 0,
      max: 1,
      fallback: 1,
    });
  }

  if (!partial || body.text_alignment !== undefined) {
    const textAlignment = body.text_alignment || "left";
    if (!VALID_TEXT_ALIGNMENTS.has(textAlignment)) {
      throw ApiError.badRequest("Invalid text alignment");
    }
    payload.text_alignment = textAlignment;
  }

  if (!partial || body.box_x !== undefined) {
    payload.box_x = toClampedNumber(body.box_x, {
      min: 0,
      max: 92,
      fallback: 8,
    });
  }

  if (!partial || body.box_y !== undefined) {
    payload.box_y = toClampedNumber(body.box_y, {
      min: 0,
      max: 76,
      fallback: 18,
    });
  }

  if (!partial || body.box_width_desktop !== undefined) {
    payload.box_width_desktop = toClampedNumber(body.box_width_desktop, {
      min: 24,
      max: 90,
      fallback: 42,
    });
  }

  if (!partial || body.box_width_tablet !== undefined) {
    payload.box_width_tablet = toClampedNumber(body.box_width_tablet, {
      min: 30,
      max: 94,
      fallback: 56,
    });
  }

  if (!partial || body.box_width_mobile !== undefined) {
    payload.box_width_mobile = toClampedNumber(body.box_width_mobile, {
      min: 40,
      max: 98,
      fallback: 88,
    });
  }

  if (!partial || body.sort_order !== undefined) {
    payload.sort_order = toClampedNumber(body.sort_order, {
      min: 0,
      max: 9999,
      fallback: 0,
      integer: true,
    });
  }

  if (!partial || body.is_active !== undefined) {
    payload.is_active = body.is_active !== undefined ? !!body.is_active : true;
  }

  const backgroundType =
    payload.background_type ??
    body.background_type ??
    existingBanner?.background_type;
  const backgroundImage =
    payload.background_image !== undefined
      ? payload.background_image
      : body.background_image !== undefined
        ? body.background_image
        : existingBanner?.background_image;

  if (!partial && backgroundType === "image" && !backgroundImage) {
    throw ApiError.badRequest("Background image is required for image banners");
  }

  if (partial && backgroundType === "image" && body.background_image !== undefined && !backgroundImage) {
    throw ApiError.badRequest("Background image is required for image banners");
  }

  return payload;
}

exports.getAllAdmin = asyncHandler(async (_req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("hero_banners")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw ApiError.internal(error.message);

  res.json({ banners: data || [] });
});

exports.createAdmin = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const payload = normalizePayload(req.body);
  payload.created_by = req.user.id;

  const { data, error } = await supabaseAdmin
    .from("hero_banners")
    .insert([payload])
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  res.status(201).json({ banner: data });
});

exports.updateAdmin = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data: existingBanner, error: fetchError } = await supabaseAdmin
    .from("hero_banners")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (fetchError) throw ApiError.internal(fetchError.message);
  if (!existingBanner) throw ApiError.notFound("Hero banner not found");

  const updates = normalizePayload(req.body, {
    partial: true,
    existingBanner,
  });

  const { data, error } = await supabaseAdmin
    .from("hero_banners")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Hero banner not found");

  res.json({ banner: data });
});

exports.deleteAdmin = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { error } = await supabaseAdmin
    .from("hero_banners")
    .delete()
    .eq("id", req.params.id);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "Hero banner deleted successfully" });
});

exports.getActive = asyncHandler(async (_req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("hero_banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw ApiError.internal(error.message);

  res.json({ banners: data || [] });
});
