const { Router } = require("express");
const roomController = require("../controllers/roomController");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = Router();

// Public
router.get("/", roomController.getAll);
router.get("/:id", roomController.getById);

// Admin only
router.post("/", requireAuth, requireAdmin, roomController.create);
router.put("/:id", requireAuth, requireAdmin, roomController.update);
router.delete("/:id", requireAuth, requireAdmin, roomController.remove);

module.exports = router;
