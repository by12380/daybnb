import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api";

function getRequestError(err) {
  return err?.response?.data?.error || err?.response?.data?.message || err?.message || "Request failed";
}

export const fetchAdminHeroBanners = createAsyncThunk(
  "heroBanners/fetchAdmin",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/admin/hero-banners");
      return data;
    } catch (err) {
      return rejectWithValue(getRequestError(err));
    }
  }
);

export const createAdminHeroBanner = createAsyncThunk(
  "heroBanners/createAdmin",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/admin/hero-banners", payload);
      return data;
    } catch (err) {
      return rejectWithValue(getRequestError(err));
    }
  }
);

export const updateAdminHeroBanner = createAsyncThunk(
  "heroBanners/updateAdmin",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/admin/hero-banners/${id}`, payload);
      return data;
    } catch (err) {
      return rejectWithValue(getRequestError(err));
    }
  }
);

export const deleteAdminHeroBanner = createAsyncThunk(
  "heroBanners/deleteAdmin",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/hero-banners/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getRequestError(err));
    }
  }
);

export const fetchPublicHeroBanners = createAsyncThunk(
  "heroBanners/fetchPublic",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/hero-banners");
      return data;
    } catch (err) {
      return rejectWithValue(getRequestError(err));
    }
  }
);

const initialState = {
  adminBanners: [],
  publicBanners: [],
  loading: false,
  publicLoading: false,
  publicLoaded: false,
  error: null,
};

const heroBannerSlice = createSlice({
  name: "heroBanners",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminHeroBanners.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminHeroBanners.fulfilled, (state, action) => {
        state.loading = false;
        state.adminBanners = action.payload.banners || [];
      })
      .addCase(fetchAdminHeroBanners.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createAdminHeroBanner.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAdminHeroBanner.fulfilled, (state, action) => {
        state.loading = false;
        state.adminBanners.unshift(action.payload.banner);
      })
      .addCase(createAdminHeroBanner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateAdminHeroBanner.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAdminHeroBanner.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.banner;
        const index = state.adminBanners.findIndex((item) => item.id === updated.id);

        if (index !== -1) {
          state.adminBanners[index] = updated;
        }

        const publicIndex = state.publicBanners.findIndex((item) => item.id === updated.id);
        if (updated.is_active) {
          if (publicIndex !== -1) {
            state.publicBanners[publicIndex] = updated;
          }
        } else if (publicIndex !== -1) {
          state.publicBanners = state.publicBanners.filter((item) => item.id !== updated.id);
        }
      })
      .addCase(updateAdminHeroBanner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteAdminHeroBanner.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAdminHeroBanner.fulfilled, (state, action) => {
        state.loading = false;
        state.adminBanners = state.adminBanners.filter((item) => item.id !== action.payload);
        state.publicBanners = state.publicBanners.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteAdminHeroBanner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchPublicHeroBanners.pending, (state) => {
        state.publicLoading = true;
        state.error = null;
      })
      .addCase(fetchPublicHeroBanners.fulfilled, (state, action) => {
        state.publicLoading = false;
        state.publicLoaded = true;
        state.publicBanners = action.payload.banners || [];
      })
      .addCase(fetchPublicHeroBanners.rejected, (state, action) => {
        state.publicLoading = false;
        state.publicLoaded = true;
        state.error = action.payload;
      });
  },
});

export default heroBannerSlice.reducer;
