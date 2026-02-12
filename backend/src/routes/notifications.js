const { Router } = require("express");
const notificationController = require("../controllers/notificationController");
const { requireAuth } = require("../middleware/auth");
const { attachRole, requireRole, ROLES } = require("../middleware/rbac");
const { handleImpersonation } = require("../middleware/impersonate");

const router = Router();

// All notification routes require authentication.
// Routes that support impersonation use attachRole + handleImpersonation
// so that when an admin impersonates an owner, the owner's notifications
// are returned/modified instead of the admin's own.
router.get("/", requireAuth, attachRole, handleImpersonation, notificationController.getMine);
router.get(
  "/admin",
  requireAuth,
  attachRole,
  requireRole(ROLES.ADMIN),
  notificationController.getAdmin
);
router.patch("/read-all", requireAuth, attachRole, handleImpersonation, notificationController.markAllRead);
router.patch("/:id/read", requireAuth, attachRole, handleImpersonation, notificationController.markRead);
router.delete("/all", requireAuth, attachRole, handleImpersonation, notificationController.removeAll);
router.delete("/:id", requireAuth, notificationController.remove);

module.exports = router;
