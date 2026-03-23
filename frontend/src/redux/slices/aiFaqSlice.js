import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api";

function getRequestError(err) {
  return err?.response?.data?.error || err?.response?.data?.message || err?.message || "Request failed";
}

export const fetchAdminAiFaqs = createAsyncThunk(
  "aiFaqs/fetchAdmin",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/admin/ai-faqs");
      return data;
    } catch (err) {
      return rejectWithValue(getRequestError(err));
    }
  }
);

export const createAdminAiFaq = createAsyncThunk(
  "aiFaqs/createAdmin",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/admin/ai-faqs", payload);
      return data;
    } catch (err) {
      return rejectWithValue(getRequestError(err));
    }
  }
);

export const updateAdminAiFaq = createAsyncThunk(
  "aiFaqs/updateAdmin",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/admin/ai-faqs/${id}`, payload);
      return data;
    } catch (err) {
      return rejectWithValue(getRequestError(err));
    }
  }
);

export const deleteAdminAiFaq = createAsyncThunk(
  "aiFaqs/deleteAdmin",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/ai-faqs/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getRequestError(err));
    }
  }
);

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const aiFaqSlice = createSlice({
  name: "aiFaqs",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminAiFaqs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminAiFaqs.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.faqs || [];
      })
      .addCase(fetchAdminAiFaqs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createAdminAiFaq.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAdminAiFaq.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload.faq);
      })
      .addCase(createAdminAiFaq.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateAdminAiFaq.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAdminAiFaq.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.faq;
        const index = state.items.findIndex((item) => item.id === updated.id);
        if (index !== -1) {
          state.items[index] = updated;
        }
      })
      .addCase(updateAdminAiFaq.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteAdminAiFaq.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAdminAiFaq.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteAdminAiFaq.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default aiFaqSlice.reducer;
