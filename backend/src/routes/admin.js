const { Router } = require("express");
const adminController = require("../controllers/adminController");
const { requireAuth } = require("../middleware/auth");
const { attachRole, requireRole, ROLES } = require("../middleware/rbac");

const router = Router();

// All admin routes require authentication + admin role
const adminMiddleware = [requireAuth, attachRole, requireRole(ROLES.ADMIN)];

// ── Impersonation ────────────────────────────────────
router.post(
  "/impersonate/:ownerId",
  ...adminMiddleware,
  adminController.startImpersonation
);
router.post(
  "/stop-impersonate",
  ...adminMiddleware,
  adminController.stopImpersonation
);

// ── Owner Management ─────────────────────────────────
router.get("/owners", ...adminMiddleware, adminController.listOwners);
router.get("/owners/:ownerId", ...adminMiddleware, adminController.getOwner);
router.put("/owners/:ownerId", ...adminMiddleware, adminController.updateOwner);
router.delete("/owners/:ownerId", ...adminMiddleware, adminController.deleteOwner);

// ── Role Management ──────────────────────────────────
router.put(
  "/users/:userId/role",
  ...adminMiddleware,
  adminController.changeUserRole
);

// ── Dashboard Stats ──────────────────────────────────
router.get("/dashboard-stats", ...adminMiddleware, adminController.getDashboardStats);

module.exports = router;
