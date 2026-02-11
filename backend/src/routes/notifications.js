const { Router } = require("express");
const notificationController = require("../controllers/notificationController");
const { requireAuth } = require("../middleware/auth");
const { attachRole, requireRole, ROLES } = require("../middleware/rbac");

const router = Router();

// All notification routes require authentication
router.get("/", requireAuth, notificationController.getMine);
router.get(
  "/admin",
  requireAuth,
  attachRole,
  requireRole(ROLES.ADMIN),
  notificationController.getAdmin
);
router.patch("/read-all", requireAuth, notificationController.markAllRead);
router.patch("/:id/read", requireAuth, notificationController.markRead);
router.delete("/all", requireAuth, notificationController.removeAll);
router.delete("/:id", requireAuth, notificationController.remove);

module.exports = router;
