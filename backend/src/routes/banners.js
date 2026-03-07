const { Router } = require("express");
const bannerController = require("../controllers/bannerController");

const router = Router();

router.get("/", bannerController.getActiveBanners);

module.exports = router;
