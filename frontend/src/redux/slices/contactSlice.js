import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// ─── Async Thunks ────────────────────────────────────────────

export const submitContact = createAsyncThunk(
  "contact/submit",
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/contact", formData);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchMessages = createAsyncThunk(
  "contact/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/contact");
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const markMessageRead = createAsyncThunk(
  "contact/markRead",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/contact/${id}/read`);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteMessage = createAsyncThunk(
  "contact/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/contact/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────

const initialState = {
  messages: [],
  unreadCount: 0,
  submitSuccess: false,
  loading: false,
  error: null,
};

const contactSlice = createSlice({
  name: "contact",
  initialState,
  reducers: {
    clearContactError(state) {
      state.error = null;
    },
    resetSubmitSuccess(state) {
      state.submitSuccess = false;
    },
  },
  extraReducers: (builder) => {
    // Submit contact form
    builder
      .addCase(submitContact.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.submitSuccess = false;
      })
      .addCase(submitContact.fulfilled, (state) => {
        state.loading = false;
        state.submitSuccess = true;
      })
      .addCase(submitContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch all messages (admin)
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload.messages;
        state.unreadCount = action.payload.messages.filter(
          (m) => !m.is_read
        ).length;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Mark message as read (admin)
    builder
      .addCase(markMessageRead.fulfilled, (state, action) => {
        const updated = action.payload.contact;
        const idx = state.messages.findIndex((m) => m.id === updated.id);
        if (idx !== -1) {
          state.messages[idx] = updated;
        }
        state.unreadCount = state.messages.filter((m) => !m.is_read).length;
      })
      .addCase(markMessageRead.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Delete message (admin)
    builder
      .addCase(deleteMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = state.messages.filter((m) => m.id !== action.payload);
        state.unreadCount = state.messages.filter((m) => !m.is_read).length;
      })
      .addCase(deleteMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearContactError, resetSubmitSuccess } = contactSlice.actions;

export default contactSlice.reducer;
