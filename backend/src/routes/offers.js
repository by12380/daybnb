const { Router } = require("express");
const offerController = require("../controllers/offerController");

const router = Router();

// Public endpoints (no auth needed)
router.get("/active", offerController.getActiveOffers);
router.get("/banners", offerController.getBanners);
router.get("/room/:roomId", offerController.getOfferForRoom);

module.exports = router;
