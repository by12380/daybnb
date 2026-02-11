const { supabaseAdmin } = require("../config/supabase");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("./rbac");

/**
 * Impersonation middleware for admin users.
 *
 * When an admin sends the `x-impersonate-owner` header with a valid owner's
 * user ID, the middleware sets:
 *   - req.impersonating = true
 *   - req.originalUser   = the admin's actual user object
 *   - req.originalRole   = "admin"
 *   - req.effectiveUserId = the owner's user ID
 *   - req.effectiveRole   = "owner"
 *
 * Downstream controllers can then scope data to `req.effectiveUserId`
 * instead of `req.user.id` to act on behalf of the impersonated owner.
 *
 * If the header is absent or the user is not an admin, the middleware
 * simply sets the effective fields to the actual user's values and
 * continues.
 *
 * Must be placed AFTER requireAuth and attachRole.
 */
async function handleImpersonation(req, _res, next) {
  try {
    // Default: no impersonation – effective identity equals actual identity
    req.impersonating = false;
    req.originalUser = req.user;
    req.originalRole = req.userRole;
    req.effectiveUserId = req.user?.id || null;
    req.effectiveRole = req.userRole || ROLES.CUSTOMER;

    const impersonateOwnerId = req.headers["x-impersonate-owner"];

    if (!impersonateOwnerId) {
      return next();
    }

    // Only admins can impersonate
    if (req.userRole !== ROLES.ADMIN) {
      return next(ApiError.forbidden("Only admins can impersonate other users"));
    }

    if (!supabaseAdmin) {
      return next(ApiError.internal("Supabase admin client is not configured"));
    }

    // Verify the target is a valid owner
    const { data: targetProfile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, user_type, full_name, email")
      .eq("id", impersonateOwnerId)
      .maybeSingle();

    if (error) {
      return next(ApiError.internal("Failed to look up impersonation target"));
    }

    if (!targetProfile) {
      return next(ApiError.notFound("Impersonation target user not found"));
    }

    if (targetProfile.user_type !== ROLES.OWNER) {
      return next(
        ApiError.badRequest("Can only impersonate users with the owner role")
      );
    }

    // Set impersonation context
    req.impersonating = true;
    req.effectiveUserId = targetProfile.id;
    req.effectiveRole = ROLES.OWNER;
    req.impersonatedOwner = targetProfile;

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { handleImpersonation };
