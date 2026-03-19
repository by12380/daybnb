const { Router } = require("express");
const multer = require("multer");
const chatController = require("../controllers/chatController");
const { requireAuth } = require("../middleware/auth");
const { attachRole, requireRole, ROLES } = require("../middleware/rbac");
const ApiError = require("../utils/ApiError");

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function optionalChatAttachmentUpload(req, res, next) {
  upload.single("attachment")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return next(ApiError.badRequest("Attachment must be 10 MB or smaller"));
    }

    return next(err);
  });
}

// Disable ETag caching for all chat routes (always fresh data)
router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// All chat routes require authentication
router.use(requireAuth, attachRole);

// ── Customer endpoints ──────────────────────────────────────
router.get("/contacts", chatController.getChatContacts);
router.get("/conversations", chatController.getMyConversations);
router.get("/conversations/:conversationId/messages", chatController.getMessages);
router.post(
  "/conversations/:conversationId/messages",
  optionalChatAttachmentUpload,
  chatController.sendMessage
);
router.post("/conversations/start/:recipientId", chatController.getOrCreateConversation);
router.patch("/conversations/:conversationId/read", chatController.markAsRead);

// ── Admin / Owner panel endpoint ────────────────────────────
router.get(
  "/panel/conversations",
  requireRole(ROLES.ADMIN, ROLES.OWNER),
  chatController.getAllConversations
);

module.exports = router;
