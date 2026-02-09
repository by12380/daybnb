const { Router } = require("express");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.getMe);
router.post("/ensure-profile", requireAuth, authController.ensureProfile);
router.put("/profile", requireAuth, authController.updateProfile);

module.exports = router;
