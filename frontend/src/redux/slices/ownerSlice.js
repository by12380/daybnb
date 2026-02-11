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

// ─── Slice ───────────────────────────────────────────────────

const initialState = {
  rooms: [],
  roomsTotal: 0,
  bookings: [],
  bookingsTotal: 0,
  customers: [],
  customersTotal: 0,
  customerBookings: [],
  stats: null,
  loading: false,
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
  },
});

export const { clearOwnerError, clearCustomerBookings, resetOwner } = ownerSlice.actions;

export default ownerSlice.reducer;
