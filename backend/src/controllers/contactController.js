const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/**
 * POST /api/contact
 * Submit a contact form message (public – no auth required).
 */
exports.submit = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    throw ApiError.badRequest("Name, email, and message are required");
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({
      name: name.trim(),
      email: email.trim(),
      subject: subject?.trim() || null,
      message: message.trim(),
    })
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
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw ApiError.internal(error.message);

  res.json({ messages: data || [] });
});

/**
 * DELETE /api/contact/:id  (admin only)
 * Delete a contact message.
 */
exports.remove = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { error } = await supabaseAdmin
    .from("messages")
    .delete()
    .eq("id", req.params.id);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "Message deleted successfully" });
});
