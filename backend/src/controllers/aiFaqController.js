const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

function toSortOrder(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(9999, Math.round(parsed)));
}

function normalizePayload(body, { partial = false } = {}) {
  const payload = {};

  if (!partial || body.question !== undefined) {
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) throw ApiError.badRequest("Question is required");
    payload.question = question;
  }

  if (!partial || body.answer !== undefined) {
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";
    if (!answer) throw ApiError.badRequest("Answer is required");
    payload.answer = answer;
  }

  if (!partial || body.sort_order !== undefined) {
    payload.sort_order = toSortOrder(body.sort_order, 0);
  }

  if (!partial || body.is_active !== undefined) {
    payload.is_active = body.is_active !== undefined ? !!body.is_active : true;
  }

  return payload;
}

exports.getAllAdmin = asyncHandler(async (_req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("ai_faqs")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw ApiError.internal(error.message);

  res.json({ faqs: data || [] });
});

exports.createAdmin = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const payload = normalizePayload(req.body);
  payload.created_by = req.user.id;

  const { data, error } = await supabaseAdmin
    .from("ai_faqs")
    .insert([payload])
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  res.status(201).json({ faq: data });
});

exports.updateAdmin = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data: existingFaq, error: fetchError } = await supabaseAdmin
    .from("ai_faqs")
    .select("id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (fetchError) throw ApiError.internal(fetchError.message);
  if (!existingFaq) throw ApiError.notFound("FAQ not found");

  const updates = normalizePayload(req.body, { partial: true });

  const { data, error } = await supabaseAdmin
    .from("ai_faqs")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("FAQ not found");

  res.json({ faq: data });
});

exports.deleteAdmin = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { error } = await supabaseAdmin
    .from("ai_faqs")
    .delete()
    .eq("id", req.params.id);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "FAQ deleted successfully" });
});
