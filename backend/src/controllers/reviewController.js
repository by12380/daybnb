const { supabase, supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/**
 * GET /api/reviews?room_id=xxx
 * Get reviews for a room (public).
 */
exports.getByRoom = asyncHandler(async (req, res) => {
  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const { room_id } = req.query;

  if (!room_id) {
    throw ApiError.badRequest("room_id query parameter is required");
  }

  const { data, error } = await supabase
    .from("room_reviews")
    .select("*")
    .eq("room_id", room_id)
    .order("created_at", { ascending: false });

  if (error) throw ApiError.internal(error.message);

  res.json({ reviews: data || [] });
});

/**
 * POST /api/reviews
 * Create or update a review (upsert on user_id + room_id).
 */
exports.upsert = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { room_id, rating, note } = req.body;

  if (!room_id) throw ApiError.badRequest("room_id is required");

  const ratingNum = Number(rating);
  if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    throw ApiError.badRequest("Rating must be between 1 and 5");
  }

  const payload = {
    room_id,
    user_id: req.user.id,
    user_email: req.user.email || null,
    user_full_name:
      req.user.user_metadata?.full_name ||
      req.user.user_metadata?.name ||
      null,
    rating: ratingNum,
    note: note?.trim() || null,
  };

  const { data, error } = await supabaseAdmin
    .from("room_reviews")
    .upsert(payload, { onConflict: "user_id,room_id" })
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  res.status(201).json({ review: data });
});

/**
 * DELETE /api/reviews/:id
 * Delete a review (admin or review owner).
 */
exports.remove = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  // Check ownership
  const { data: existing } = await supabaseAdmin
    .from("room_reviews")
    .select("user_id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!existing) throw ApiError.notFound("Review not found");

  if (req.userRole !== "admin" && existing.user_id !== req.user.id) {
    throw ApiError.forbidden("Access denied");
  }

  const { error } = await supabaseAdmin
    .from("room_reviews")
    .delete()
    .eq("id", req.params.id);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "Review deleted successfully" });
});
