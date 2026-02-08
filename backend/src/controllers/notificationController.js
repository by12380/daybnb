const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/**
 * GET /api/notifications
 * Get notifications for the authenticated user.
 */
exports.getMine = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("recipient_user_id", req.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw ApiError.internal(error.message);

  res.json({ notifications: data || [] });
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read.
 */
exports.markRead = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("id", req.params.id)
    .eq("recipient_user_id", req.user.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Notification not found");

  res.json({ notification: data });
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
exports.markAllRead = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("recipient_user_id", req.user.id)
    .eq("read", false);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "All notifications marked as read" });
});
