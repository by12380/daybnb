const path = require("path");
const { randomUUID } = require("crypto");
const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

const CHAT_ATTACHMENTS_BUCKET =
  process.env.CHAT_ATTACHMENTS_BUCKET || "chat-attachments";
const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/octet-stream",
]);

function normalizeMessageContent(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function sanitizeAttachmentName(fileName = "attachment") {
  return path
    .basename(fileName)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

function isAllowedAttachment(file) {
  if (!file?.mimetype) return false;
  return (
    file.mimetype.startsWith("image/") ||
    ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimetype)
  );
}

async function uploadAttachment({ conversationId, senderId, file }) {
  if (!supabaseAdmin) {
    throw ApiError.internal("Supabase storage is not configured");
  }

  if (!file?.buffer) {
    throw ApiError.badRequest("Attachment file is required");
  }

  if (file.size > MAX_CHAT_ATTACHMENT_SIZE_BYTES) {
    throw ApiError.badRequest("Attachment must be 10 MB or smaller");
  }

  if (!isAllowedAttachment(file)) {
    throw ApiError.badRequest("This attachment type is not supported");
  }

  const safeName = sanitizeAttachmentName(file.originalname);
  const objectPath = `${conversationId}/${senderId}/${Date.now()}-${randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("[Chat] uploadAttachment error:", uploadError.message);
    throw ApiError.internal("Failed to upload chat attachment");
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(CHAT_ATTACHMENTS_BUCKET).getPublicUrl(objectPath);

  return {
    attachment_path: objectPath,
    attachment_url: publicUrl,
    attachment_name: file.originalname || safeName,
    attachment_mime_type: file.mimetype || "application/octet-stream",
    attachment_size: file.size || 0,
  };
}

async function removeAttachment(attachmentPath) {
  if (!supabaseAdmin || !attachmentPath) return;
  await supabaseAdmin.storage.from(CHAT_ATTACHMENTS_BUCKET).remove([attachmentPath]);
}

/**
 * Find existing conversation between two users (checks both orderings).
 */
async function findConversation(userA, userB) {
  // Check A→B
  let { data, error } = await supabaseAdmin
    .from("chat_conversations")
    .select("*")
    .eq("participant_one", userA)
    .eq("participant_two", userB)
    .maybeSingle();

  if (error) throw ApiError.internal(error.message);
  if (data) return data;

  // Check B→A
  ({ data, error } = await supabaseAdmin
    .from("chat_conversations")
    .select("*")
    .eq("participant_one", userB)
    .eq("participant_two", userA)
    .maybeSingle());

  if (error) throw ApiError.internal(error.message);
  return data || null;
}

// ── Get or create a conversation between two users ──────────
const getOrCreateConversation = asyncHandler(async (req, res) => {
  const myId = req.user.id;
  const { recipientId } = req.params;

  if (!recipientId) throw ApiError.badRequest("recipientId is required");
  if (myId === recipientId) throw ApiError.badRequest("Cannot chat with yourself");

  // Try to find existing conversation (either direction)
  let conversation = await findConversation(myId, recipientId);

  // Create if it doesn't exist
  if (!conversation) {
    // Normalise order so participant_one < participant_two (satisfies DB constraint if any)
    const [p1, p2] = myId < recipientId ? [myId, recipientId] : [recipientId, myId];

    const { data: newConv, error: createError } = await supabaseAdmin
      .from("chat_conversations")
      .insert({ participant_one: p1, participant_two: p2 })
      .select()
      .single();

    if (createError) {
      console.error("[Chat] Failed to create conversation:", createError.message, { p1, p2 });
      throw ApiError.internal(createError.message);
    }
    conversation = newConv;
  }

  res.json({ conversation });
});

// ── List all conversations for the current user ─────────────
const getMyConversations = asyncHandler(async (req, res) => {
  const myId = req.user.id;

  const { data: conversations, error } = await supabaseAdmin
    .from("chat_conversations")
    .select("*")
    .or(`participant_one.eq.${myId},participant_two.eq.${myId}`)
    .order("last_message_at", { ascending: false });

  if (error) throw ApiError.internal(error.message);

  // For each conversation, fetch the other participant's profile info
  const enriched = await Promise.all(
    (conversations || []).map(async (conv) => {
      const otherId =
        conv.participant_one === myId ? conv.participant_two : conv.participant_one;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, user_type")
        .eq("id", otherId)
        .maybeSingle();

      // Get last message
      const { data: lastMsg } = await supabaseAdmin
        .from("chat_messages")
        .select(
          "content, sender_id, created_at, is_read, attachment_name, attachment_url, attachment_mime_type, attachment_size"
        )
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get unread count
      const { count: unreadCount } = await supabaseAdmin
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .eq("is_read", false)
        .neq("sender_id", myId);

      return {
        ...conv,
        other_participant: profile || { id: otherId, full_name: "Unknown User" },
        last_message: lastMsg || null,
        unread_count: unreadCount || 0,
      };
    })
  );

  res.json({ conversations: enriched });
});

// ── Get messages for a conversation ─────────────────────────
const getMessages = asyncHandler(async (req, res) => {
  const myId = req.user.id;
  const { conversationId } = req.params;
  const { limit = 50, before } = req.query;

  // Verify user is a participant
  const { data: conv, error: convError } = await supabaseAdmin
    .from("chat_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (convError) throw ApiError.internal(convError.message);
  if (!conv) throw ApiError.notFound("Conversation not found");

  // Admins can view any conversation; participants can view their own
  const isParticipant =
    conv.participant_one === myId || conv.participant_two === myId;
  const isAdmin = req.userRole === "admin";

  if (!isParticipant && !isAdmin) {
    throw ApiError.forbidden("Not a participant in this conversation");
  }

  let query = supabaseAdmin
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(parseInt(limit, 10));

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data: messages, error } = await query;
  if (error) {
    console.error("[Chat] getMessages error:", error.message, error.code);
    throw ApiError.internal(error.message);
  }

  // Mark messages from the other person as read
  if (isParticipant) {
    await supabaseAdmin
      .from("chat_messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", myId)
      .eq("is_read", false);
  }

  res.json({ messages: messages || [] });
});

// ── Send a message ──────────────────────────────────────────
const sendMessage = asyncHandler(async (req, res) => {
  const myId = req.user.id;
  const { conversationId } = req.params;
  const content = normalizeMessageContent(req.body?.content);
  const attachmentFile = req.file;

  if (!content && !attachmentFile) {
    throw ApiError.badRequest("Message text or attachment is required");
  }

  // Verify user is a participant
  const { data: conv, error: convError } = await supabaseAdmin
    .from("chat_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (convError) throw ApiError.internal(convError.message);
  if (!conv) throw ApiError.notFound("Conversation not found");

  const isParticipant =
    conv.participant_one === myId || conv.participant_two === myId;

  if (!isParticipant) {
    throw ApiError.forbidden("Not a participant in this conversation");
  }

  let uploadedAttachment = null;
  if (attachmentFile) {
    uploadedAttachment = await uploadAttachment({
      conversationId,
      senderId: myId,
      file: attachmentFile,
    });
  }

  const messagePayload = {
    conversation_id: conversationId,
    sender_id: myId,
    content,
  };

  if (uploadedAttachment) {
    messagePayload.attachment_url = uploadedAttachment.attachment_url;
    messagePayload.attachment_name = uploadedAttachment.attachment_name;
    messagePayload.attachment_mime_type = uploadedAttachment.attachment_mime_type;
    messagePayload.attachment_size = uploadedAttachment.attachment_size;
  }

  const { data: message, error } = await supabaseAdmin
    .from("chat_messages")
    .insert(messagePayload)
    .select()
    .single();

  if (error) {
    await removeAttachment(uploadedAttachment?.attachment_path);
    console.error("[Chat] sendMessage error:", error.message, error.code, error.details);
    throw ApiError.internal(error.message);
  }

  // Update conversation last_message_at
  await supabaseAdmin
    .from("chat_conversations")
    .update({ last_message_at: message.created_at })
    .eq("id", conversationId);

  // Emit via socket to the other participant
  const recipientId =
    conv.participant_one === myId ? conv.participant_two : conv.participant_one;

  const { getIO } = require("../socket");
  const io = getIO();
  if (io) {
    io.to(`user:${recipientId}`).emit("chat:message", {
      message,
      conversationId,
    });
    // Also emit to sender so other tabs sync
    io.to(`user:${myId}`).emit("chat:message", {
      message,
      conversationId,
    });
  }

  res.status(201).json({ message });
});

// ── Get chat contacts for a customer ────────────────────────
// Returns admin + owners the customer has bookings with
const getChatContacts = asyncHandler(async (req, res) => {
  const myId = req.user.id;

  const contacts = [];

  // 1. Get admin(s) for support
  const { data: admins } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, user_type")
    .eq("user_type", "admin");

  if (admins?.length) {
    contacts.push(
      ...admins.map((a) => ({
        ...a,
        chat_label: "DayBnB Support",
      }))
    );
  }

  // 2. Get room_ids from customer's bookings
  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("room_id")
    .eq("user_id", myId);

  if (bookings?.length) {
    const roomIds = [...new Set(bookings.map((b) => b.room_id).filter(Boolean))];

    if (roomIds.length) {
      const { data: rooms } = await supabaseAdmin
        .from("rooms")
        .select("id, owner_id")
        .in("id", roomIds);

      const ownerIds = [...new Set((rooms || []).map((r) => r.owner_id).filter(Boolean))];

      if (ownerIds.length) {
        const { data: owners } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, email, user_type")
          .in("id", ownerIds);

        if (owners?.length) {
          contacts.push(
            ...owners.map((o) => ({
              ...o,
              chat_label: o.full_name || o.email || "Room Owner",
            }))
          );
        }
      }
    }
  }

  res.json({ contacts });
});

// ── Get all conversations for admin/owner panel ─────────────
const getAllConversations = asyncHandler(async (req, res) => {
  const myId = req.user.id;
  const role = req.userRole;

  let query = supabaseAdmin
    .from("chat_conversations")
    .select("*")
    .order("last_message_at", { ascending: false });

  if (role === "owner") {
    // Owners only see their own conversations
    query = query.or(`participant_one.eq.${myId},participant_two.eq.${myId}`);
  }
  // Admins see conversations where they are a participant
  if (role === "admin") {
    query = query.or(`participant_one.eq.${myId},participant_two.eq.${myId}`);
  }

  const { data: conversations, error } = await query;
  if (error) throw ApiError.internal(error.message);

  const enriched = await Promise.all(
    (conversations || []).map(async (conv) => {
      const otherId =
        conv.participant_one === myId ? conv.participant_two : conv.participant_one;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, user_type")
        .eq("id", otherId)
        .maybeSingle();

      const { data: lastMsg } = await supabaseAdmin
        .from("chat_messages")
        .select(
          "content, sender_id, created_at, is_read, attachment_name, attachment_url, attachment_mime_type, attachment_size"
        )
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: unreadCount } = await supabaseAdmin
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .eq("is_read", false)
        .neq("sender_id", myId);

      return {
        ...conv,
        other_participant: profile || { id: otherId, full_name: "Unknown User" },
        last_message: lastMsg || null,
        unread_count: unreadCount || 0,
      };
    })
  );

  res.json({ conversations: enriched });
});

// ── Mark messages as read ───────────────────────────────────
const markAsRead = asyncHandler(async (req, res) => {
  const myId = req.user.id;
  const { conversationId } = req.params;

  const { error } = await supabaseAdmin
    .from("chat_messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", myId)
    .eq("is_read", false);

  if (error) throw ApiError.internal(error.message);

  res.json({ success: true });
});

module.exports = {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  getChatContacts,
  getAllConversations,
  markAsRead,
};
