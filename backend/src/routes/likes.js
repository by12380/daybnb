const { Router } = require("express");
const likesController = require("../controllers/likesController");
const { requireAuth } = require("../middleware/auth");

const router = Router();

// All likes routes require authentication
router.get("/", requireAuth, likesController.getLikedRoomIds);
router.post("/", requireAuth, likesController.likeRoom);
router.delete("/:roomId", requireAuth, likesController.unlikeRoom);

module.exports = router;
