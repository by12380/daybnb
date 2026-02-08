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
