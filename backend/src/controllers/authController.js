const { supabase } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/**
 * POST /api/auth/signup
 * Register a new user with email + password.
 */
exports.signup = asyncHandler(async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest("Email and password are required");
  }

  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: full_name || null },
    },
  });

  if (error) throw ApiError.badRequest(error.message);

  res.status(201).json({
    message: "Signup successful. Check your email for confirmation.",
    user: data.user,
    session: data.session,
  });
});

/**
 * POST /api/auth/login
 * Sign in with email + password.
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

  res.json({
    user: data.user,
    session: data.session,
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
 * Return the currently authenticated user's profile.
 */
exports.getMe = asyncHandler(async (req, res) => {
  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", req.user.id)
    .maybeSingle();

  res.json({
    user: req.user,
    profile: profile || null,
  });
});

/**
 * POST /api/auth/ensure-profile
 * Ensure a profile row exists for the authenticated user.
 * Creates one if missing, or updates email if already present.
 * Body: { is_signup: boolean }
 */
exports.ensureProfile = asyncHandler(async (req, res) => {
  if (!supabase) throw ApiError.internal("Supabase is not configured");

  const user = req.user;
  const { is_signup } = req.body;

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
      user_type: is_signup ? "user" : null,
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
