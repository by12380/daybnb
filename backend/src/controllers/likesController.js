const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/**
 * GET /api/likes
 * Get all liked room IDs for the authenticated user.
 */
exports.getLikedRoomIds = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("room_likes")
    .select("room_id")
    .eq("user_id", req.user.id);

  if (error) throw ApiError.internal(error.message);

  const roomIds = (data || []).map((r) => r.room_id).filter(Boolean);
  res.json({ room_ids: roomIds });
});

/**
 * POST /api/likes
 * Like a room. Body: { room_id }
 */
exports.likeRoom = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { room_id } = req.body;
  if (!room_id) throw ApiError.badRequest("room_id is required");

  const { error } = await supabaseAdmin.from("room_likes").insert({
    user_id: req.user.id,
    room_id,
  });

  if (error) {
    // Duplicate like – treat as success
    if (error.code === "23505") {
      return res.json({ message: "Already liked" });
    }
    throw ApiError.internal(error.message);
  }

  res.status(201).json({ message: "Room liked" });
});

/**
 * DELETE /api/likes/:roomId
 * Unlike a room.
 */
exports.unlikeRoom = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { error } = await supabaseAdmin
    .from("room_likes")
    .delete()
    .eq("user_id", req.user.id)
    .eq("room_id", req.params.roomId);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "Room unliked" });
});
