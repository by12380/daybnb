import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// ─── Rooms ───────────────────────────────────────────────────

export const fetchOwnerRooms = createAsyncThunk(
  "owner/fetchRooms",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/owner/rooms", { params });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createOwnerRoom = createAsyncThunk(
  "owner/createRoom",
  async (roomData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/owner/rooms", roomData);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateOwnerRoom = createAsyncThunk(
  "owner/updateRoom",
  async ({ id, ...updates }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/owner/rooms/${id}`, updates);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteOwnerRoom = createAsyncThunk(
  "owner/deleteRoom",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/owner/rooms/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Bookings ────────────────────────────────────────────────

export const fetchOwnerBookings = createAsyncThunk(
  "owner/fetchBookings",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/owner/bookings", { params });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const approveOwnerBooking = createAsyncThunk(
  "owner/approveBooking",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/owner/bookings/${id}/approve`);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const rejectOwnerBooking = createAsyncThunk(
  "owner/rejectBooking",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/owner/bookings/${id}/reject`, { reason });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const checkInOwnerBooking = createAsyncThunk(
  "owner/checkInBooking",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/owner/bookings/${id}/check-in`);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const checkOutOwnerBooking = createAsyncThunk(
  "owner/checkOutBooking",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/owner/bookings/${id}/check-out`);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchOwnerTodayBookings = createAsyncThunk(
  "owner/fetchTodayBookings",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/owner/bookings/today");
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchOwnerBookingHistory = createAsyncThunk(
  "owner/fetchBookingHistory",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/owner/bookings/history", { params });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Customers ───────────────────────────────────────────────

export const fetchOwnerCustomers = createAsyncThunk(
  "owner/fetchCustomers",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/owner/customers", { params });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchOwnerCustomerBookings = createAsyncThunk(
  "owner/fetchCustomerBookings",
  async (customerId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/owner/customers/${customerId}/bookings`);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Owner Profile ───────────────────────────────────────────

export const fetchOwnerProfile = createAsyncThunk(
  "owner/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/owner/profile");
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateOwnerProfile = createAsyncThunk(
  "owner/updateProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      const { data } = await api.put("/owner/profile", profileData);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Co-hosts ────────────────────────────────────────────────

export const fetchCoHosts = createAsyncThunk(
  "owner/fetchCoHosts",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/owner/co-hosts");
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchCoHostInvites = createAsyncThunk(
  "owner/fetchCoHostInvites",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/owner/co-host-invites");
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const inviteCoHost = createAsyncThunk(
  "owner/inviteCoHost",
  async ({ email }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/owner/co-hosts", { email });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const respondToCoHostInvite = createAsyncThunk(
  "owner/respondToCoHostInvite",
  async ({ id, action }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/owner/co-hosts/${id}/respond`, { action });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateCoHostPermissions = createAsyncThunk(
  "owner/updateCoHostPermissions",
  async ({ id, permissions }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/owner/co-hosts/${id}/permissions`, { permissions });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const removeCoHost = createAsyncThunk(
  "owner/removeCoHost",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/owner/co-hosts/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Stats ───────────────────────────────────────────────────

export const fetchOwnerStats = createAsyncThunk(
  "owner/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/owner/stats");
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Analytics (rich dashboard) ──────────────────────────────

export const fetchOwnerAnalytics = createAsyncThunk(
  "owner/fetchAnalytics",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/owner/analytics", { params });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────

const initialState = {
  rooms: [],
  roomsTotal: 0,
  bookings: [],
  bookingsTotal: 0,
  todayBookings: [],
  todayTotal: 0,
  historyBookings: [],
  historyTotal: 0,
  customers: [],
  customersTotal: 0,
  customerBookings: [],
  stats: null,
  analytics: null,
  analyticsLoading: false,
  analyticsError: null,
  profile: null,
  profileLoading: false,
  coHosts: [],
  coHostInvites: [],
  coHostLoading: false,
  loading: false,
  todayLoading: false,
  historyLoading: false,
  error: null,
};

const ownerSlice = createSlice({
  name: "owner",
  initialState,
  reducers: {
    clearOwnerError(state) {
      state.error = null;
    },
    clearCustomerBookings(state) {
      state.customerBookings = [];
    },
    resetOwner() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Rooms
    builder
      .addCase(fetchOwnerRooms.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOwnerRooms.fulfilled, (state, action) => { state.loading = false; state.rooms = action.payload.rooms; state.roomsTotal = action.payload.total; })
      .addCase(fetchOwnerRooms.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    builder
      .addCase(createOwnerRoom.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createOwnerRoom.fulfilled, (state, action) => { state.loading = false; state.rooms.unshift(action.payload.room); state.roomsTotal += 1; })
      .addCase(createOwnerRoom.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    builder
      .addCase(updateOwnerRoom.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateOwnerRoom.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.room;
        const idx = state.rooms.findIndex((r) => r.id === updated.id);
        if (idx !== -1) state.rooms[idx] = updated;
      })
      .addCase(updateOwnerRoom.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    builder
      .addCase(deleteOwnerRoom.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteOwnerRoom.fulfilled, (state, action) => { state.loading = false; state.rooms = state.rooms.filter((r) => r.id !== action.payload); state.roomsTotal -= 1; })
      .addCase(deleteOwnerRoom.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // Bookings
    builder
      .addCase(fetchOwnerBookings.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOwnerBookings.fulfilled, (state, action) => { state.loading = false; state.bookings = action.payload.bookings; state.bookingsTotal = action.payload.total; })
      .addCase(fetchOwnerBookings.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    builder
      .addCase(approveOwnerBooking.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(approveOwnerBooking.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.booking;
        const idx = state.bookings.findIndex((b) => b.id === updated.id);
        if (idx !== -1) state.bookings[idx] = updated;
      })
      .addCase(approveOwnerBooking.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    builder
      .addCase(rejectOwnerBooking.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(rejectOwnerBooking.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.booking;
        const idx = state.bookings.findIndex((b) => b.id === updated.id);
        if (idx !== -1) state.bookings[idx] = updated;
      })
      .addCase(rejectOwnerBooking.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // Check-in
    builder
      .addCase(checkInOwnerBooking.fulfilled, (state, action) => {
        const updated = action.payload.booking;
        const idx = state.bookings.findIndex((b) => b.id === updated.id);
        if (idx !== -1) state.bookings[idx] = updated;
        const tIdx = state.todayBookings.findIndex((b) => b.id === updated.id);
        if (tIdx !== -1) state.todayBookings[tIdx] = { ...state.todayBookings[tIdx], ...updated };
      })
      .addCase(checkInOwnerBooking.rejected, (state, action) => { state.error = action.payload; });

    // Check-out
    builder
      .addCase(checkOutOwnerBooking.fulfilled, (state, action) => {
        const updated = action.payload.booking;
        const idx = state.bookings.findIndex((b) => b.id === updated.id);
        if (idx !== -1) state.bookings[idx] = updated;
        state.todayBookings = state.todayBookings.filter((b) => b.id !== updated.id);
        state.todayTotal = Math.max(0, state.todayTotal - 1);
      })
      .addCase(checkOutOwnerBooking.rejected, (state, action) => { state.error = action.payload; });

    // Today's bookings
    builder
      .addCase(fetchOwnerTodayBookings.pending, (state) => { state.todayLoading = true; state.error = null; })
      .addCase(fetchOwnerTodayBookings.fulfilled, (state, action) => { state.todayLoading = false; state.todayBookings = action.payload.bookings; state.todayTotal = action.payload.total; })
      .addCase(fetchOwnerTodayBookings.rejected, (state, action) => { state.todayLoading = false; state.error = action.payload; });

    // Booking history
    builder
      .addCase(fetchOwnerBookingHistory.pending, (state) => { state.historyLoading = true; state.error = null; })
      .addCase(fetchOwnerBookingHistory.fulfilled, (state, action) => { state.historyLoading = false; state.historyBookings = action.payload.bookings; state.historyTotal = action.payload.total; })
      .addCase(fetchOwnerBookingHistory.rejected, (state, action) => { state.historyLoading = false; state.error = action.payload; });

    // Customers
    builder
      .addCase(fetchOwnerCustomers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOwnerCustomers.fulfilled, (state, action) => { state.loading = false; state.customers = action.payload.customers; state.customersTotal = action.payload.total; })
      .addCase(fetchOwnerCustomers.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    builder
      .addCase(fetchOwnerCustomerBookings.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOwnerCustomerBookings.fulfilled, (state, action) => { state.loading = false; state.customerBookings = action.payload.bookings; })
      .addCase(fetchOwnerCustomerBookings.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // Stats
    builder
      .addCase(fetchOwnerStats.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOwnerStats.fulfilled, (state, action) => { state.loading = false; state.stats = action.payload.stats; })
      .addCase(fetchOwnerStats.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

    // Analytics
    builder
      .addCase(fetchOwnerAnalytics.pending, (state) => { state.analyticsLoading = true; state.analyticsError = null; })
      .addCase(fetchOwnerAnalytics.fulfilled, (state, action) => { state.analyticsLoading = false; state.analytics = action.payload; })
      .addCase(fetchOwnerAnalytics.rejected, (state, action) => { state.analyticsLoading = false; state.analyticsError = action.payload; });

    // Owner Profile
    builder
      .addCase(fetchOwnerProfile.pending, (state) => { state.profileLoading = true; state.error = null; })
      .addCase(fetchOwnerProfile.fulfilled, (state, action) => { state.profileLoading = false; state.profile = action.payload.profile; })
      .addCase(fetchOwnerProfile.rejected, (state, action) => { state.profileLoading = false; state.error = action.payload; });

    builder
      .addCase(updateOwnerProfile.pending, (state) => { state.profileLoading = true; state.error = null; })
      .addCase(updateOwnerProfile.fulfilled, (state, action) => { state.profileLoading = false; state.profile = action.payload.profile; })
      .addCase(updateOwnerProfile.rejected, (state, action) => { state.profileLoading = false; state.error = action.payload; });

    // Co-hosts
    builder
      .addCase(fetchCoHosts.pending, (state) => { state.coHostLoading = true; })
      .addCase(fetchCoHosts.fulfilled, (state, action) => { state.coHostLoading = false; state.coHosts = action.payload.co_hosts; })
      .addCase(fetchCoHosts.rejected, (state, action) => { state.coHostLoading = false; state.error = action.payload; });

    builder
      .addCase(fetchCoHostInvites.pending, (state) => { state.coHostLoading = true; })
      .addCase(fetchCoHostInvites.fulfilled, (state, action) => { state.coHostLoading = false; state.coHostInvites = action.payload.invites; })
      .addCase(fetchCoHostInvites.rejected, (state, action) => { state.coHostLoading = false; state.error = action.payload; });

    builder
      .addCase(inviteCoHost.fulfilled, (state, action) => { state.coHosts.unshift(action.payload.co_host); })
      .addCase(inviteCoHost.rejected, (state, action) => { state.error = action.payload; });

    builder
      .addCase(respondToCoHostInvite.fulfilled, (state, action) => {
        const updated = action.payload.co_host;
        const idx = state.coHostInvites.findIndex((i) => i.id === updated.id);
        if (idx !== -1) state.coHostInvites[idx] = { ...state.coHostInvites[idx], ...updated };
      })
      .addCase(respondToCoHostInvite.rejected, (state, action) => { state.error = action.payload; });

    builder
      .addCase(updateCoHostPermissions.fulfilled, (state, action) => {
        const updated = action.payload.co_host;
        const idx = state.coHosts.findIndex((c) => c.id === updated.id);
        if (idx !== -1) state.coHosts[idx] = { ...state.coHosts[idx], ...updated };
      });

    builder
      .addCase(removeCoHost.fulfilled, (state, action) => {
        state.coHosts = state.coHosts.filter((c) => c.id !== action.payload);
      })
      .addCase(removeCoHost.rejected, (state, action) => { state.error = action.payload; });
  },
});

export const { clearOwnerError, clearCustomerBookings, resetOwner } = ownerSlice.actions;

export default ownerSlice.reducer;
