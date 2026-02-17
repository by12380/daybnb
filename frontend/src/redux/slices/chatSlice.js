import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// ── Thunks ──────────────────────────────────────────────────

export const fetchChatContacts = createAsyncThunk(
  "chat/fetchContacts",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/chat/contacts");
      return data.contacts;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchConversations = createAsyncThunk(
  "chat/fetchConversations",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/chat/conversations");
      return data.conversations;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchPanelConversations = createAsyncThunk(
  "chat/fetchPanelConversations",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/chat/panel/conversations");
      return data.conversations;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async (conversationId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(
        `/chat/conversations/${conversationId}/messages`
      );
      return { conversationId, messages: data.messages };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ conversationId, content }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/chat/conversations/${conversationId}/messages`,
        { content }
      );
      return data.message;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const startConversation = createAsyncThunk(
  "chat/startConversation",
  async (recipientId, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        `/chat/conversations/start/${recipientId}`
      );
      return data.conversation;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const markConversationRead = createAsyncThunk(
  "chat/markRead",
  async (conversationId, { rejectWithValue }) => {
    try {
      await api.patch(`/chat/conversations/${conversationId}/read`);
      return conversationId;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ── Slice ───────────────────────────────────────────────────

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    contacts: [],
    conversations: [],
    activeConversationId: null,
    messages: {},
    loading: false,
    messagesLoading: false,
    error: null,
  },
  reducers: {
    setActiveConversation(state, action) {
      state.activeConversationId = action.payload;
    },
    clearActiveConversation(state) {
      state.activeConversationId = null;
    },
    addIncomingMessage(state, action) {
      const { message, conversationId } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      // Avoid duplicates
      const exists = state.messages[conversationId].some(
        (m) => m.id === message.id
      );
      if (!exists) {
        state.messages[conversationId].push(message);
      }
      // Update conversation last_message in list
      const conv = state.conversations.find((c) => c.id === conversationId);
      if (conv) {
        conv.last_message = {
          content: message.content,
          sender_id: message.sender_id,
          created_at: message.created_at,
          is_read: message.is_read,
        };
        conv.last_message_at = message.created_at;
        // If this conversation is not the active one, increment unread
        if (state.activeConversationId !== conversationId) {
          conv.unread_count = (conv.unread_count || 0) + 1;
        }
      }
    },
    resetChat(state) {
      state.contacts = [];
      state.conversations = [];
      state.activeConversationId = null;
      state.messages = {};
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Contacts
      .addCase(fetchChatContacts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchChatContacts.fulfilled, (state, action) => {
        state.contacts = action.payload;
        state.loading = false;
      })
      .addCase(fetchChatContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Conversations
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.conversations = action.payload;
        state.loading = false;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Panel conversations
      .addCase(fetchPanelConversations.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPanelConversations.fulfilled, (state, action) => {
        state.conversations = action.payload;
        state.loading = false;
      })
      .addCase(fetchPanelConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Messages
      .addCase(fetchMessages.pending, (state) => {
        state.messagesLoading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messages[action.payload.conversationId] = action.payload.messages;
        state.messagesLoading = false;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.messagesLoading = false;
        state.error = action.payload;
      })

      // Send message
      .addCase(sendMessage.fulfilled, (state, action) => {
        const msg = action.payload;
        if (!state.messages[msg.conversation_id]) {
          state.messages[msg.conversation_id] = [];
        }
        const exists = state.messages[msg.conversation_id].some(
          (m) => m.id === msg.id
        );
        if (!exists) {
          state.messages[msg.conversation_id].push(msg);
        }
        // Update conversation
        const conv = state.conversations.find(
          (c) => c.id === msg.conversation_id
        );
        if (conv) {
          conv.last_message = {
            content: msg.content,
            sender_id: msg.sender_id,
            created_at: msg.created_at,
            is_read: false,
          };
          conv.last_message_at = msg.created_at;
        }
      })

      // Start conversation
      .addCase(startConversation.fulfilled, (state, action) => {
        state.activeConversationId = action.payload.id;
        // Add to conversations if not already there
        const exists = state.conversations.some(
          (c) => c.id === action.payload.id
        );
        if (!exists) {
          state.conversations.unshift({
            ...action.payload,
            other_participant: null,
            last_message: null,
            unread_count: 0,
          });
        }
      })

      // Mark read
      .addCase(markConversationRead.fulfilled, (state, action) => {
        const conv = state.conversations.find(
          (c) => c.id === action.payload
        );
        if (conv) {
          conv.unread_count = 0;
        }
      });
  },
});

export const {
  setActiveConversation,
  clearActiveConversation,
  addIncomingMessage,
  resetChat,
} = chatSlice.actions;

export default chatSlice.reducer;
