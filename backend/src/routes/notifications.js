const { Router } = require("express");
const notificationController = require("../controllers/notificationController");
const { requireAuth } = require("../middleware/auth");

const router = Router();

// All notification routes require authentication
router.get("/", requireAuth, notificationController.getMine);
router.patch("/read-all", requireAuth, notificationController.markAllRead);
router.patch("/:id/read", requireAuth, notificationController.markRead);

module.exports = router;
