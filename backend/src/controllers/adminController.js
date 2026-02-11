const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../middleware/rbac");

/**
 * POST /api/admin/impersonate/:ownerId
 * Start impersonating an owner. Returns the owner's profile so the
 * client can store the owner context and send the `x-impersonate-owner`
 * header on subsequent requests.
 *
 * Only admins can call this.
 */
exports.startImpersonation = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { ownerId } = req.params;

  if (!ownerId) {
    throw ApiError.badRequest("Owner ID is required");
  }

  // Verify the target is a valid owner
  const { data: ownerProfile, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", ownerId)
    .maybeSingle();

  if (error) throw ApiError.internal(error.message);
  if (!ownerProfile) throw ApiError.notFound("Owner not found");

  if (ownerProfile.user_type !== ROLES.OWNER) {
    throw ApiError.badRequest(
      "Can only impersonate users with the owner role"
    );
  }

  res.json({
    message: `Now impersonating owner: ${ownerProfile.full_name || ownerProfile.email || ownerId}`,
    owner: ownerProfile,
    impersonation_header: "x-impersonate-owner",
    impersonation_value: ownerId,
  });
});

/**
 * POST /api/admin/stop-impersonate
 * Stop impersonating. This is a convenience endpoint – the client
 * can also just stop sending the `x-impersonate-owner` header.
 *
 * Returns the admin's own profile.
 */
exports.stopImpersonation = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", req.user.id)
    .maybeSingle();

  res.json({
    message: "Impersonation stopped. You are now back as admin.",
    admin: adminProfile || { id: req.user.id, email: req.user.email },
  });
});

/**
 * GET /api/admin/owners
 * List all owner accounts. Admin only.
 * Supports: ?search=name&limit=50&offset=0
 */
exports.listOwners = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { search, limit = 50, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("user_type", ROLES.OWNER)
    .order("created_at", { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw ApiError.internal(error.message);

  res.json({ owners: data, total: count });
});

/**
 * GET /api/admin/owners/:ownerId
 * Get a single owner's full profile. Admin only.
 */
exports.getOwner = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", req.params.ownerId)
    .eq("user_type", ROLES.OWNER)
    .maybeSingle();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Owner not found");

  res.json({ owner: data });
});

/**
 * PUT /api/admin/owners/:ownerId
 * Update an owner's profile. Admin only.
 */
exports.updateOwner = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { full_name, phone, email } = req.body;

  const updates = { updated_at: new Date().toISOString() };
  if (full_name !== undefined) updates.full_name = full_name?.trim() || null;
  if (phone !== undefined) updates.phone = phone?.trim() || null;
  if (email !== undefined) updates.email = email?.trim() || null;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", req.params.ownerId)
    .eq("user_type", ROLES.OWNER)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Owner not found");

  res.json({ owner: data });
});

/**
 * DELETE /api/admin/owners/:ownerId
 * Delete an owner account. Admin only.
 */
exports.deleteOwner = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  // Verify the target is an owner before deleting
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, user_type")
    .eq("id", req.params.ownerId)
    .maybeSingle();

  if (!profile) throw ApiError.notFound("Owner not found");
  if (profile.user_type !== ROLES.OWNER) {
    throw ApiError.badRequest("Target user is not an owner");
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", req.params.ownerId);

  if (error) throw ApiError.internal(error.message);

  res.json({ message: "Owner account deleted successfully" });
});

/**
 * PUT /api/admin/users/:userId/role
 * Change a user's role. Admin only.
 * Body: { role: "owner" | "customer" | "admin" }
 */
exports.changeUserRole = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  const { role } = req.body;
  const validRoles = [ROLES.ADMIN, ROLES.OWNER, ROLES.CUSTOMER];

  if (!role || !validRoles.includes(role)) {
    throw ApiError.badRequest(
      `Invalid role. Must be one of: ${validRoles.join(", ")}`
    );
  }

  // Prevent admin from demoting themselves
  if (req.params.userId === req.user.id && role !== ROLES.ADMIN) {
    throw ApiError.badRequest("Cannot change your own admin role");
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ user_type: role, updated_at: new Date().toISOString() })
    .eq("id", req.params.userId)
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("User not found");

  res.json({
    message: `User role updated to ${role}`,
    user: data,
  });
});

/**
 * GET /api/admin/dashboard-stats
 * Aggregate stats for admin dashboard.
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
  if (!supabaseAdmin) throw ApiError.internal("Supabase is not configured");

  // Count by role
  const { count: totalOwners } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_type", ROLES.OWNER);

  const { count: totalCustomers } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_type", ROLES.CUSTOMER);

  const { count: totalRooms } = await supabaseAdmin
    .from("rooms")
    .select("id", { count: "exact", head: true });

  const { count: totalBookings } = await supabaseAdmin
    .from("bookings")
    .select("id", { count: "exact", head: true });

  res.json({
    stats: {
      total_owners: totalOwners || 0,
      total_customers: totalCustomers || 0,
      total_rooms: totalRooms || 0,
      total_bookings: totalBookings || 0,
    },
  });
});
