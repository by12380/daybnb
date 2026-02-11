const { Router } = require("express");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { attachRole } = require("../middleware/rbac");
const { handleImpersonation } = require("../middleware/impersonate");

const router = Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

// /me supports impersonation context so the frontend can detect it
router.get(
  "/me",
  requireAuth,
  attachRole,
  handleImpersonation,
  authController.getMe
);

router.post("/ensure-profile", requireAuth, authController.ensureProfile);
router.put("/profile", requireAuth, authController.updateProfile);

module.exports = router;
