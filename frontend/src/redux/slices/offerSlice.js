import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// ─── Admin thunks ─────────────────────────────────────────────

export const fetchAdminOffers = createAsyncThunk(
  "offers/fetchAdmin",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/admin/offers", { params });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createAdminOffer = createAsyncThunk(
  "offers/createAdmin",
  async (offerData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/admin/offers", offerData);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateAdminOffer = createAsyncThunk(
  "offers/updateAdmin",
  async ({ id, ...updates }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/admin/offers/${id}`, updates);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteAdminOffer = createAsyncThunk(
  "offers/deleteAdmin",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/offers/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Owner thunks ─────────────────────────────────────────────

export const fetchOwnerOffers = createAsyncThunk(
  "offers/fetchOwner",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/owner/offers", { params });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createOwnerOffer = createAsyncThunk(
  "offers/createOwner",
  async (offerData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/owner/offers", offerData);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateOwnerOffer = createAsyncThunk(
  "offers/updateOwner",
  async ({ id, ...updates }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/owner/offers/${id}`, updates);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteOwnerOffer = createAsyncThunk(
  "offers/deleteOwner",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/owner/offers/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Public thunks ────────────────────────────────────────────

export const fetchActiveOffers = createAsyncThunk(
  "offers/fetchActive",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/offers/active");
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchBanners = createAsyncThunk(
  "offers/fetchBanners",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/offers/banners");
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchOfferForRoom = createAsyncThunk(
  "offers/fetchForRoom",
  async (roomId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/offers/room/${roomId}`);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────

const initialState = {
  offers: [],
  total: 0,
  activeOffers: [],
  banners: [],
  roomOffer: null,
  loading: false,
  error: null,
};

const offerSlice = createSlice({
  name: "offers",
  initialState,
  reducers: {
    clearOfferError(state) { state.error = null; },
    clearRoomOffer(state) { state.roomOffer = null; },
  },
  extraReducers: (builder) => {
    // Admin fetch
    builder
      .addCase(fetchAdminOffers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAdminOffers.fulfilled, (state, action) => { state.loading = false; state.offers = action.payload.offers; state.total = action.payload.total; })
      .addCase(fetchAdminOffers.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // Admin create
    builder
      .addCase(createAdminOffer.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createAdminOffer.fulfilled, (state, action) => { state.loading = false; state.offers.unshift(action.payload.offer); state.total += 1; })
      .addCase(createAdminOffer.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // Admin update
    builder
      .addCase(updateAdminOffer.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateAdminOffer.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.offer;
        const idx = state.offers.findIndex((o) => o.id === updated.id);
        if (idx !== -1) state.offers[idx] = updated;
      })
      .addCase(updateAdminOffer.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // Admin delete
    builder
      .addCase(deleteAdminOffer.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteAdminOffer.fulfilled, (state, action) => { state.loading = false; state.offers = state.offers.filter((o) => o.id !== action.payload); state.total -= 1; })
      .addCase(deleteAdminOffer.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // Owner fetch
    builder
      .addCase(fetchOwnerOffers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOwnerOffers.fulfilled, (state, action) => { state.loading = false; state.offers = action.payload.offers; state.total = action.payload.total; })
      .addCase(fetchOwnerOffers.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // Owner create
    builder
      .addCase(createOwnerOffer.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createOwnerOffer.fulfilled, (state, action) => { state.loading = false; state.offers.unshift(action.payload.offer); state.total += 1; })
      .addCase(createOwnerOffer.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // Owner update
    builder
      .addCase(updateOwnerOffer.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateOwnerOffer.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.offer;
        const idx = state.offers.findIndex((o) => o.id === updated.id);
        if (idx !== -1) state.offers[idx] = updated;
      })
      .addCase(updateOwnerOffer.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // Owner delete
    builder
      .addCase(deleteOwnerOffer.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteOwnerOffer.fulfilled, (state, action) => { state.loading = false; state.offers = state.offers.filter((o) => o.id !== action.payload); state.total -= 1; })
      .addCase(deleteOwnerOffer.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // Public — active offers
    builder
      .addCase(fetchActiveOffers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchActiveOffers.fulfilled, (state, action) => { state.loading = false; state.activeOffers = action.payload.offers; })
      .addCase(fetchActiveOffers.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // Public — banners
    builder
      .addCase(fetchBanners.pending, (state) => { state.error = null; })
      .addCase(fetchBanners.fulfilled, (state, action) => { state.banners = action.payload.banners; })
      .addCase(fetchBanners.rejected, (state, action) => { state.error = action.payload; });

    // Public — room offer
    builder
      .addCase(fetchOfferForRoom.pending, (state) => { state.error = null; })
      .addCase(fetchOfferForRoom.fulfilled, (state, action) => { state.roomOffer = action.payload.offer; })
      .addCase(fetchOfferForRoom.rejected, (state, action) => { state.error = action.payload; });
  },
});

export const { clearOfferError, clearRoomOffer } = offerSlice.actions;

export default offerSlice.reducer;
