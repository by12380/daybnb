const { supabaseAdmin } = require("../config/supabase");
const ApiError = require("../utils/ApiError");

/**
 * Valid roles in the system, ordered by privilege level.
 */
const ROLES = {
  ADMIN: "admin",
  OWNER: "owner",
  CUSTOMER: "customer",
};

/**
 * Middleware that fetches the authenticated user's role from the profiles
 * table and attaches it to `req.userRole`.
 *
 * Must be placed AFTER requireAuth so that `req.user` is available.
 */
async function attachRole(req, _res, next) {
  try {
    if (!req.user) {
      req.userRole = null;
      return next();
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
      console.warn("Failed to fetch user role:", error.message);
      req.userRole = ROLES.CUSTOMER;
      return next();
    }

    req.userRole = profile?.user_type || ROLES.CUSTOMER;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Returns a middleware that restricts access to specific roles.
 *
 * Usage:
 *   router.get("/admin-only", requireAuth, attachRole, requireRole("admin"), handler);
 *   router.get("/owner-or-admin", requireAuth, attachRole, requireRole("admin", "owner"), handler);
 *
 * @param  {...string} allowedRoles - One or more roles that are permitted.
 */
function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    const userRole = req.userRole || ROLES.CUSTOMER;

    if (!allowedRoles.includes(userRole)) {
      return next(
        ApiError.forbidden(
          `Access denied. Required role: ${allowedRoles.join(" or ")}`
        )
      );
    }

    next();
  };
}

module.exports = { ROLES, attachRole, requireRole };
