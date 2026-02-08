const { supabaseAdmin } = require("../config/supabase");
const ApiError = require("../utils/ApiError");

/**
 * Middleware that checks if the authenticated user has the "admin" role.
 * Must be placed AFTER requireAuth so that `req.user` is available.
 *
 * It looks up the user's `profiles.user_type` column in Supabase
 * (using the admin client to bypass RLS).
 */
async function requireAdmin(req, _res, next) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized("Authentication required");
    }

    if (!supabaseAdmin) {
      throw ApiError.internal("Supabase admin client is not configured");
    }

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("user_type")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) {
      throw ApiError.internal("Failed to verify admin status");
    }

    if (!profile || profile.user_type !== "admin") {
      throw ApiError.forbidden("Admin access required");
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAdmin };
