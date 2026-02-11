const { Router } = require("express");
const bookingController = require("../controllers/bookingController");
const { requireAuth } = require("../middleware/auth");
const { attachRole, requireRole, ROLES } = require("../middleware/rbac");

const router = Router();

// Public
router.get("/availability/:roomId", bookingController.getAvailability);
router.get("/booked-rooms", bookingController.getBookedRoomsByDate);

// Authenticated (role-aware) — the controller handles role-based scoping
router.get("/", requireAuth, attachRole, bookingController.getAll);
router.get("/:id", requireAuth, attachRole, bookingController.getById);
router.post("/", requireAuth, attachRole, bookingController.create);
router.put("/:id", requireAuth, attachRole, bookingController.update);
router.delete("/:id", requireAuth, attachRole, bookingController.remove);

// Admin or room owner can approve/reject
router.patch(
  "/:id/approve",
  requireAuth,
  attachRole,
  requireRole(ROLES.ADMIN, ROLES.OWNER),
  bookingController.approve
);
router.patch(
  "/:id/reject",
  requireAuth,
  attachRole,
  requireRole(ROLES.ADMIN, ROLES.OWNER),
  bookingController.reject
);

module.exports = router;
