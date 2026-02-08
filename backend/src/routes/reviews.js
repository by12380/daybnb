const { Router } = require("express");
const reviewController = require("../controllers/reviewController");
const { requireAuth } = require("../middleware/auth");
const { supabaseAdmin } = require("../config/supabase");

const router = Router();

/**
 * Attach user role for ownership checks in the controller.
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
router.get("/", reviewController.getByRoom);

// Authenticated
router.post("/", requireAuth, reviewController.upsert);
router.delete("/:id", requireAuth, attachUserRole, reviewController.remove);

module.exports = router;
