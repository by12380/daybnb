const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/**
 * POST /api/contact
 * Submit a contact form message (public – no auth required).
 */
exports.submit = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { name, email, mobile, city, message } = req.body;

  if (!name || !email || !message) {
    throw ApiError.badRequest("Name, email, and message are required");
  }

  const payload = {
    name: name.trim(),
    email: email.trim(),
    mobile: mobile?.trim() || null,
    city: city?.trim() || null,
    message: message.trim(),
  };

  // Attach user_id if the request comes from an authenticated user
  if (req.user?.id) {
    payload.user_id = req.user.id;
  }

  const { data, error } = await supabaseAdmin
    .from("contact_messages")
    .insert(payload)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  res.status(201).json({
    message: "Message sent successfully",
    contact: data,
  });
});

/**
 * GET /api/contact  (admin only)
 * Get all contact messages.
 */
exports.getAll = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw ApiError.internal(error.message);

  res.json({ messages: data || [] });
});

/**
 * PATCH /api/contact/:id/read  (admin only)
 * Mark a contact message as read.
 */
exports.markRead = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("contact_messages")
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Message not found");

  res.json({ contact: data });
});

/**
 * DELETE /api/contact/:id  (admin only)
 * Delete a contact message.
 */
exports.remove = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { error } = await supabaseAdmin
    .from("contact_messages")
    .delete()
    .eq("id", req.params.id);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "Message deleted successfully" });
});
