const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/**
 * GET /api/users  (admin only)
 * List all user profiles. Supports filtering by role.
 * Query params: ?search=...&role=owner|customer|admin&limit=50&offset=0
 */
exports.getAll = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { search, role, limit = 50, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  if (role) {
    query = query.eq("user_type", role);
  }

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  res.json({ users: data, total: count });
});

/**
 * GET /api/users/:id  (admin only)
 * Get a single user profile by ID.
 */
exports.getById = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("User not found");

  res.json({ user: data });
});

/**
 * PUT /api/users/:id  (admin only)
 * Update a user profile.
 */
exports.update = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { full_name, phone, user_type } = req.body;

  const updates = { updated_at: new Date().toISOString() };
  if (full_name !== undefined) updates.full_name = full_name?.trim() || null;
  if (phone !== undefined) updates.phone = phone?.trim() || null;
  if (user_type !== undefined) updates.user_type = user_type;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("User not found");

  res.json({ user: data });
});

/**
 * DELETE /api/users/:id  (admin only)
 * Delete a user profile.
 */
exports.remove = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { error } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", req.params.id);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "User profile deleted successfully" });
});

/**
 * GET /api/users/:id/bookings  (admin only)
 * Get all bookings for a specific user.
 */
exports.getUserBookings = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*, room:rooms(*)")
    .eq("user_id", req.params.id)
    .order("booking_date", { ascending: false });

  if (error) throw ApiError.internal(error.message);

  res.json({ bookings: data || [] });
});
