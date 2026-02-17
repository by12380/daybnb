const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

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
        .select("content, sender_id, created_at, is_read")
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
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw ApiError.badRequest("Message content is required");
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

  // Insert the message
  const { data: message, error } = await supabaseAdmin
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: myId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
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
        .select("content, sender_id, created_at, is_read")
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
