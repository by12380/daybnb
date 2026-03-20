const { Router } = require("express");
const ownerController = require("../controllers/ownerController");
const offerController = require("../controllers/offerController");
const { requireAuth } = require("../middleware/auth");
const { attachRole, requireRole, ROLES } = require("../middleware/rbac");
const { handleImpersonation } = require("../middleware/impersonate");

const router = Router();

/**
 * All owner routes require authentication + owner (or admin) role.
 * The impersonation middleware allows admins to act as an owner by
 * sending the `x-impersonate-owner` header.
 */
const ownerMiddleware = [
  requireAuth,
  attachRole,
  requireRole(ROLES.ADMIN, ROLES.OWNER),
  handleImpersonation,
];

// ── Owner Profile / Dashboard ────────────────────────
router.get("/profile", ...ownerMiddleware, ownerController.getMyProfile);
router.get("/stats", ...ownerMiddleware, ownerController.getStats);
router.get("/analytics", ...ownerMiddleware, ownerController.getAnalytics);

// ── Rooms ────────────────────────────────────────────
router.get("/rooms", ...ownerMiddleware, ownerController.getMyRooms);
router.post("/rooms", ...ownerMiddleware, ownerController.createRoom);
router.put("/rooms/:id", ...ownerMiddleware, ownerController.updateRoom);
router.delete("/rooms/:id", ...ownerMiddleware, ownerController.deleteRoom);

// ── Bookings ─────────────────────────────────────────
router.get("/bookings/today", ...ownerMiddleware, ownerController.getTodayBookings);
router.get("/bookings/history", ...ownerMiddleware, ownerController.getBookingHistory);
router.get("/bookings", ...ownerMiddleware, ownerController.getMyBookings);
router.patch(
  "/bookings/:id/approve",
  ...ownerMiddleware,
  ownerController.approveBooking
);
router.patch(
  "/bookings/:id/reject",
  ...ownerMiddleware,
  ownerController.rejectBooking
);
router.patch(
  "/bookings/:id/check-in",
  ...ownerMiddleware,
  ownerController.checkInBooking
);
router.patch(
  "/bookings/:id/check-out",
  ...ownerMiddleware,
  ownerController.checkOutBooking
);

// ── Customers ────────────────────────────────────────
router.get("/customers", ...ownerMiddleware, ownerController.getMyCustomers);
router.get("/customers/:customerId", ...ownerMiddleware, ownerController.getCustomer);
router.get(
  "/customers/:customerId/bookings",
  ...ownerMiddleware,
  ownerController.getCustomerBookings
);

// ── Offers / Discounts ──────────────────────────────
router.get("/offers", ...ownerMiddleware, offerController.getAllOwner);
router.post("/offers", ...ownerMiddleware, offerController.createOwner);
router.put("/offers/:id", ...ownerMiddleware, offerController.updateOwner);
router.delete("/offers/:id", ...ownerMiddleware, offerController.deleteOwner);

module.exports = router;
