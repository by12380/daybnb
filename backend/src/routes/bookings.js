const { Router } = require("express");
const bookingController = require("../controllers/bookingController");
const { requireAuth } = require("../middleware/auth");
const { attachRole, requireRole, ROLES } = require("../middleware/rbac");

const router = Router();

// Public
router.get("/availability/:roomId", bookingController.getAvailability);
router.get("/booked-rooms", bookingController.getBookedRoomsByDate);

// Today's check-in/check-out bookings (admin or owner)
router.get(
  "/today",
  requireAuth,
  attachRole,
  requireRole(ROLES.ADMIN, ROLES.OWNER),
  bookingController.getTodayBookings
);

// Booking history with tabs (admin or owner)
router.get(
  "/history",
  requireAuth,
  attachRole,
  requireRole(ROLES.ADMIN, ROLES.OWNER),
  bookingController.getBookingHistory
);

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

// Check-in / Check-out (admin or room owner)
router.patch(
  "/:id/check-in",
  requireAuth,
  attachRole,
  requireRole(ROLES.ADMIN, ROLES.OWNER),
  bookingController.checkIn
);
router.patch(
  "/:id/check-out",
  requireAuth,
  attachRole,
  requireRole(ROLES.ADMIN, ROLES.OWNER),
  bookingController.checkOut
);

module.exports = router;
