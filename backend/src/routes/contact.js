const { Router } = require("express");
const contactController = require("../controllers/contactController");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = Router();

// Public – anyone can submit a contact form (optionalAuth attaches user_id if logged in)
router.post("/", optionalAuth, contactController.submit);

// Admin only – view and manage messages
router.get("/", requireAuth, requireAdmin, contactController.getAll);
router.patch("/:id/read", requireAuth, requireAdmin, contactController.markRead);
router.delete("/:id", requireAuth, requireAdmin, contactController.remove);

module.exports = router;
