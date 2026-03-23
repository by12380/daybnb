const { Router } = require("express");
const adminController = require("../controllers/adminController");
const offerController = require("../controllers/offerController");
const heroBannerController = require("../controllers/heroBannerController");
const aiFaqController = require("../controllers/aiFaqController");
const { fullSync, configureIndex, isConfigured } = require("../utils/algoliaSync");
const { requireAuth } = require("../middleware/auth");
const { attachRole, requireRole, ROLES } = require("../middleware/rbac");

const router = Router();

// All admin routes require authentication + admin role
const adminMiddleware = [requireAuth, attachRole, requireRole(ROLES.ADMIN)];

// ── Impersonation ────────────────────────────────────
router.post(
  "/impersonate/:ownerId",
  ...adminMiddleware,
  adminController.startImpersonation
);
router.post(
  "/stop-impersonate",
  ...adminMiddleware,
  adminController.stopImpersonation
);

// ── Owner Management ─────────────────────────────────
router.get("/owners", ...adminMiddleware, adminController.listOwners);
router.get("/owners/:ownerId", ...adminMiddleware, adminController.getOwner);
router.put("/owners/:ownerId", ...adminMiddleware, adminController.updateOwner);
router.delete("/owners/:ownerId", ...adminMiddleware, adminController.deleteOwner);

// ── Role Management ──────────────────────────────────
router.put(
  "/users/:userId/role",
  ...adminMiddleware,
  adminController.changeUserRole
);

// ── Dashboard Stats ──────────────────────────────────
router.get("/dashboard-stats", ...adminMiddleware, adminController.getDashboardStats);

// ── Analytics ────────────────────────────────────────
router.get("/analytics", ...adminMiddleware, adminController.getAnalytics);

// ── Offers / Discounts ──────────────────────────────
router.get("/offers", ...adminMiddleware, offerController.getAllAdmin);
router.post("/offers", ...adminMiddleware, offerController.createAdmin);
router.put("/offers/:id", ...adminMiddleware, offerController.updateAdmin);
router.delete("/offers/:id", ...adminMiddleware, offerController.deleteAdmin);

// ── Landing Hero Banners ────────────────────────────
router.get("/hero-banners", ...adminMiddleware, heroBannerController.getAllAdmin);
router.post("/hero-banners", ...adminMiddleware, heroBannerController.createAdmin);
router.put("/hero-banners/:id", ...adminMiddleware, heroBannerController.updateAdmin);
router.delete("/hero-banners/:id", ...adminMiddleware, heroBannerController.deleteAdmin);

// ── AI FAQs ─────────────────────────────────────────
router.get("/ai-faqs", ...adminMiddleware, aiFaqController.getAllAdmin);
router.post("/ai-faqs", ...adminMiddleware, aiFaqController.createAdmin);
router.put("/ai-faqs/:id", ...adminMiddleware, aiFaqController.updateAdmin);
router.delete("/ai-faqs/:id", ...adminMiddleware, aiFaqController.deleteAdmin);

// ── Algolia Sync ────────────────────────────────────
router.post("/algolia/full-sync", ...adminMiddleware, async (_req, res) => {
  try {
    if (!isConfigured()) return res.status(500).json({ error: "Algolia not configured. Set ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY in backend/.env" });
    const result = await fullSync();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/algolia/configure", ...adminMiddleware, async (_req, res) => {
  try {
    if (!isConfigured()) return res.status(500).json({ error: "Algolia not configured. Set ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY in backend/.env" });
    const result = await configureIndex();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
