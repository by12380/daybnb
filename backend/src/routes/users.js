const { Router } = require("express");
const userController = require("../controllers/userController");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = Router();

// All user management routes are admin-only
router.get("/", requireAuth, requireAdmin, userController.getAll);
router.get("/:id", requireAuth, requireAdmin, userController.getById);
router.put("/:id", requireAuth, requireAdmin, userController.update);
router.delete("/:id", requireAuth, requireAdmin, userController.remove);
router.get("/:id/bookings", requireAuth, requireAdmin, userController.getUserBookings);

module.exports = router;
