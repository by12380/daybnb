const { attachRole, requireRole, ROLES } = require("./rbac");

/**
 * Legacy middleware that checks if the authenticated user has the "admin" role.
 * Must be placed AFTER requireAuth so that `req.user` is available.
 *
 * This is now a wrapper around the new RBAC middleware for backward
 * compatibility. Prefer using `attachRole` + `requireRole(ROLES.ADMIN)`
 * directly in new code.
 */
async function requireAdmin(req, res, next) {
  // First attach the role, then check it
  attachRole(req, res, (err) => {
    if (err) return next(err);
    requireRole(ROLES.ADMIN)(req, res, next);
  });
}

module.exports = { requireAdmin };
