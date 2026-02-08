const { Router } = require("express");
const contactController = require("../controllers/contactController");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = Router();

// Public – anyone can submit a contact form
router.post("/", contactController.submit);

// Admin only – view and manage messages
router.get("/", requireAuth, requireAdmin, contactController.getAll);
router.delete("/:id", requireAuth, requireAdmin, contactController.remove);

module.exports = router;
