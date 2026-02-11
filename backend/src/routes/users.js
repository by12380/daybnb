const { Router } = require("express");
const userController = require("../controllers/userController");
const { requireAuth } = require("../middleware/auth");
const { attachRole, requireRole, ROLES } = require("../middleware/rbac");

const router = Router();

// All user management routes are admin-only
const adminOnly = [requireAuth, attachRole, requireRole(ROLES.ADMIN)];

router.get("/", ...adminOnly, userController.getAll);
router.get("/:id", ...adminOnly, userController.getById);
router.put("/:id", ...adminOnly, userController.update);
router.delete("/:id", ...adminOnly, userController.remove);
router.get("/:id/bookings", ...adminOnly, userController.getUserBookings);

module.exports = router;
