import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// ─── Async Thunks ────────────────────────────────────────────

export const fetchBookings = createAsyncThunk(
  "bookings/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/bookings", { params });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchBookingById = createAsyncThunk(
  "bookings/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/bookings/${id}`);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createBooking = createAsyncThunk(
  "bookings/create",
  async (bookingData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/bookings", bookingData);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateBooking = createAsyncThunk(
  "bookings/update",
  async ({ id, ...updates }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/bookings/${id}`, updates);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const approveBooking = createAsyncThunk(
  "bookings/approve",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/bookings/${id}/approve`);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const rejectBooking = createAsyncThunk(
  "bookings/reject",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/bookings/${id}/reject`, { reason });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteBooking = createAsyncThunk(
  "bookings/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/bookings/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchAvailability = createAsyncThunk(
  "bookings/fetchAvailability",
  async (roomId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/bookings/availability/${roomId}`);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const checkInBooking = createAsyncThunk(
  "bookings/checkIn",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/bookings/${id}/check-in`);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const checkOutBooking = createAsyncThunk(
  "bookings/checkOut",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/bookings/${id}/check-out`);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchTodayBookings = createAsyncThunk(
  "bookings/fetchToday",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/bookings/today");
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchBookingHistory = createAsyncThunk(
  "bookings/fetchHistory",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/bookings/history", { params });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────

const initialState = {
  bookings: [],
  selectedBooking: null,
  bookedDates: [],
  total: 0,
  todayBookings: [],
  todayTotal: 0,
  historyBookings: [],
  historyTotal: 0,
  loading: false,
  todayLoading: false,
  historyLoading: false,
  error: null,
};

const bookingSlice = createSlice({
  name: "bookings",
  initialState,
  reducers: {
    clearBookingError(state) {
      state.error = null;
    },
    clearSelectedBooking(state) {
      state.selectedBooking = null;
    },
    clearBookedDates(state) {
      state.bookedDates = [];
    },
    clearTodayBookings(state) {
      state.todayBookings = [];
      state.todayTotal = 0;
    },
    clearHistoryBookings(state) {
      state.historyBookings = [];
      state.historyTotal = 0;
    },
  },
  extraReducers: (builder) => {
    // Fetch all bookings
    builder
      .addCase(fetchBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload.bookings;
        state.total = action.payload.total;
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch booking by ID
    builder
      .addCase(fetchBookingById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookingById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedBooking = action.payload.booking;
      })
      .addCase(fetchBookingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create booking
    builder
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings.unshift(action.payload.booking);
        state.total += 1;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update booking
    builder
      .addCase(updateBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBooking.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.booking;
        const idx = state.bookings.findIndex((b) => b.id === updated.id);
        if (idx !== -1) state.bookings[idx] = updated;
        if (state.selectedBooking?.id === updated.id) {
          state.selectedBooking = updated;
        }
      })
      .addCase(updateBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Approve booking
    builder
      .addCase(approveBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(approveBooking.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.booking;
        const idx = state.bookings.findIndex((b) => b.id === updated.id);
        if (idx !== -1) state.bookings[idx] = updated;
      })
      .addCase(approveBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Reject booking
    builder
      .addCase(rejectBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rejectBooking.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.booking;
        const idx = state.bookings.findIndex((b) => b.id === updated.id);
        if (idx !== -1) state.bookings[idx] = updated;
      })
      .addCase(rejectBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete booking
    builder
      .addCase(deleteBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = state.bookings.filter((b) => b.id !== action.payload);
        state.total -= 1;
      })
      .addCase(deleteBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch availability
    builder
      .addCase(fetchAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailability.fulfilled, (state, action) => {
        state.loading = false;
        state.bookedDates = action.payload.booked_dates;
      })
      .addCase(fetchAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Check-in
    builder
      .addCase(checkInBooking.fulfilled, (state, action) => {
        const updated = action.payload.booking;
        const idx = state.bookings.findIndex((b) => b.id === updated.id);
        if (idx !== -1) state.bookings[idx] = updated;
        const tIdx = state.todayBookings.findIndex((b) => b.id === updated.id);
        if (tIdx !== -1) state.todayBookings[tIdx] = { ...state.todayBookings[tIdx], ...updated };
      })
      .addCase(checkInBooking.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Check-out
    builder
      .addCase(checkOutBooking.fulfilled, (state, action) => {
        const updated = action.payload.booking;
        const idx = state.bookings.findIndex((b) => b.id === updated.id);
        if (idx !== -1) state.bookings[idx] = updated;
        state.todayBookings = state.todayBookings.filter((b) => b.id !== updated.id);
        state.todayTotal = Math.max(0, state.todayTotal - 1);
      })
      .addCase(checkOutBooking.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Today's bookings
    builder
      .addCase(fetchTodayBookings.pending, (state) => {
        state.todayLoading = true;
        state.error = null;
      })
      .addCase(fetchTodayBookings.fulfilled, (state, action) => {
        state.todayLoading = false;
        state.todayBookings = action.payload.bookings;
        state.todayTotal = action.payload.total;
      })
      .addCase(fetchTodayBookings.rejected, (state, action) => {
        state.todayLoading = false;
        state.error = action.payload;
      });

    // Booking history
    builder
      .addCase(fetchBookingHistory.pending, (state) => {
        state.historyLoading = true;
        state.error = null;
      })
      .addCase(fetchBookingHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.historyBookings = action.payload.bookings;
        state.historyTotal = action.payload.total;
      })
      .addCase(fetchBookingHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearBookingError, clearSelectedBooking, clearBookedDates, clearTodayBookings, clearHistoryBookings } =
  bookingSlice.actions;

export default bookingSlice.reducer;
