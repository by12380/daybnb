const { Router } = require("express");
const bookingController = require("../controllers/bookingController");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const { supabaseAdmin } = require("../config/supabase");

const router = Router();

/**
 * Middleware to attach the user's role to the request.
 * This lets controllers distinguish admin vs regular user
 * without repeating the lookup.
 */
async function attachUserRole(req, _res, next) {
  try {
    if (req.user && supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("user_type")
        .eq("id", req.user.id)
        .maybeSingle();

      req.userRole = data?.user_type || "user";
    }
  } catch {
    req.userRole = "user";
  }
  next();
}

// Public
router.get("/availability/:roomId", bookingController.getAvailability);
router.get("/booked-rooms", bookingController.getBookedRoomsByDate);

// Authenticated (role-aware)
router.get("/", requireAuth, attachUserRole, bookingController.getAll);
router.get("/:id", requireAuth, attachUserRole, bookingController.getById);
router.post("/", requireAuth, attachUserRole, bookingController.create);
router.put("/:id", requireAuth, attachUserRole, bookingController.update);
router.delete("/:id", requireAuth, attachUserRole, bookingController.remove);

// Admin only
router.patch("/:id/approve", requireAuth, requireAdmin, bookingController.approve);
router.patch("/:id/reject", requireAuth, requireAdmin, bookingController.reject);

module.exports = router;
