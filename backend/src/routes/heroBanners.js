const { Router } = require("express");
const heroBannerController = require("../controllers/heroBannerController");

const router = Router();

router.get("/", heroBannerController.getActive);

module.exports = router;
