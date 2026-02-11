const { supabase, supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../middleware/rbac");

/**
 * POST /api/auth/signup
 * Register a new user with email + password.
 * Body: { email, password, full_name, role }
 *   - role: "owner" | "customer" (default: "customer")
 */
exports.signup = asyncHandler(async (req, res) => {
  const { email, password, full_name, role } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest("Email and password are required");
  }

  // Validate requested role — only "owner" or "customer" allowed at signup
  const allowedSignupRoles = [ROLES.OWNER, ROLES.CUSTOMER];
  const requestedRole =
    role && allowedSignupRoles.includes(role) ? role : ROLES.CUSTOMER;

  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: full_name || null, role: requestedRole },
    },
  });

  if (error) throw ApiError.badRequest(error.message);

  res.status(201).json({
    message: "Signup successful. Check your email for confirmation.",
    user: data.user,
    session: data.session,
    role: requestedRole,
  });
});

/**
 * POST /api/auth/login
 * Sign in with email + password.
 * Returns the user, session, and the user's role from the profiles table.
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest("Email and password are required");
  }

  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw ApiError.unauthorized(error.message);

  // Fetch profile to include role
  let role = ROLES.CUSTOMER;
  if (supabaseAdmin && data.user) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_type")
      .eq("id", data.user.id)
      .maybeSingle();

    role = profile?.user_type || ROLES.CUSTOMER;
  }

  res.json({
    user: data.user,
    session: data.session,
    role,
  });
});

/**
 * POST /api/auth/logout
 * Sign out the current user.
 */
exports.logout = asyncHandler(async (_req, res) => {
  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const { error } = await supabase.auth.signOut();
  if (error) throw ApiError.internal(error.message);

  res.json({ message: "Logged out successfully" });
});

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile including their role.
 * When an admin is impersonating an owner, this also returns impersonation context.
 */
exports.getMe = asyncHandler(async (req, res) => {
  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", req.user.id)
    .maybeSingle();

  const response = {
    user: req.user,
    profile: profile || null,
    role: profile?.user_type || ROLES.CUSTOMER,
  };

  // If admin is impersonating, include impersonation info
  if (req.impersonating) {
    response.impersonating = true;
    response.impersonated_owner = req.impersonatedOwner;
    response.effective_role = req.effectiveRole;
  }

  res.json(response);
});

/**
 * POST /api/auth/ensure-profile
 * Ensure a profile row exists for the authenticated user.
 * Creates one if missing, or updates email if already present.
 * Body: { is_signup: boolean, role: "owner" | "customer" }
 */
exports.ensureProfile = asyncHandler(async (req, res) => {
  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const user = req.user;
  const { is_signup, role } = req.body;

  // Check if profile already exists
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id, user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    // Non-fatal – the profile screen can create it later
    console.warn("Could not check existing profile:", selectError);
    return res.json({ profile: null });
  }

  if (existing?.id) {
    // Keep email in sync without touching user_type
    const { data: updated } = await supabase
      .from("profiles")
      .update({
        email: user.email ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .maybeSingle();

    return res.json({ profile: updated || existing });
  }

  // Determine role for new profile
  const allowedSignupRoles = [ROLES.OWNER, ROLES.CUSTOMER];
  const userRole =
    is_signup && role && allowedSignupRoles.includes(role)
      ? role
      : user.user_metadata?.role && allowedSignupRoles.includes(user.user_metadata.role)
        ? user.user_metadata.role
        : ROLES.CUSTOMER;

  // Create a new profile row
  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? null,
      full_name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.display_name ||
        null,
      phone: user.phone || user.user_metadata?.phone || null,
      user_type: userRole,
      updated_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle();

  if (insertError) {
    console.warn("Could not create profile:", insertError);
    return res.json({ profile: null });
  }

  res.status(201).json({ profile: created });
});

/**
 * PUT /api/auth/profile
 * Update the currently authenticated user's own profile.
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const {
    full_name,
    phone,
    gender,
    address_line1,
    address_line2,
    city,
    state_region,
    postal_code,
    country,
  } = req.body;

  const updates = { updated_at: new Date().toISOString() };
  if (full_name !== undefined) updates.full_name = full_name?.trim() || null;
  if (phone !== undefined) updates.phone = phone?.trim() || null;
  if (gender !== undefined) updates.gender = gender || null;
  if (address_line1 !== undefined) updates.address_line1 = address_line1?.trim() || null;
  if (address_line2 !== undefined) updates.address_line2 = address_line2?.trim() || null;
  if (city !== undefined) updates.city = city?.trim() || null;
  if (state_region !== undefined) updates.state_region = state_region?.trim() || null;
  if (postal_code !== undefined) updates.postal_code = postal_code?.trim() || null;
  if (country !== undefined) updates.country = country || null;

  // Upsert so new profiles are created automatically
  const payload = {
    id: req.user.id,
    email: req.user.email,
    ...updates,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);

  res.json({ profile: data });
});
