const { Router } = require("express");
const hostsController = require("../controllers/hostsController");

const router = Router();

router.get("/", hostsController.listHosts);
router.get("/:hostId", hostsController.getHost);

module.exports = router;
