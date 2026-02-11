const { Router } = require("express");
const roomController = require("../controllers/roomController");
const { requireAuth } = require("../middleware/auth");
const { attachRole, requireRole, ROLES } = require("../middleware/rbac");

const router = Router();

// Public
router.get("/", roomController.getAll);
router.get("/:id", roomController.getById);

// Admin only — admin can manage all rooms globally
router.post("/", requireAuth, attachRole, requireRole(ROLES.ADMIN), roomController.create);
router.put("/:id", requireAuth, attachRole, requireRole(ROLES.ADMIN), roomController.update);
router.delete("/:id", requireAuth, attachRole, requireRole(ROLES.ADMIN), roomController.remove);

module.exports = router;
