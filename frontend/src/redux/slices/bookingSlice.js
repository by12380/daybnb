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

// ─── Slice ───────────────────────────────────────────────────

const initialState = {
  bookings: [],
  selectedBooking: null,
  bookedDates: [],
  total: 0,
  loading: false,
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
  },
});

export const { clearBookingError, clearSelectedBooking, clearBookedDates } =
  bookingSlice.actions;

export default bookingSlice.reducer;
