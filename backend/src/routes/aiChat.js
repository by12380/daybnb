const { Router } = require("express");
const { optionalAuth } = require("../middleware/auth");
const { chat, chatStream, getQuickPrompts } = require("../controllers/aiChatController");

const router = Router();

router.post("/chat", optionalAuth, chat);
router.post("/chat/stream", optionalAuth, chatStream);
router.get("/prompts", getQuickPrompts);

module.exports = router;
