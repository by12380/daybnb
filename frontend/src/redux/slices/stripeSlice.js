import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// ─── Async Thunks ────────────────────────────────────────────

export const createCheckoutSession = createAsyncThunk(
  "stripe/createCheckoutSession",
  async (paymentData, { rejectWithValue }) => {
    try {
      const { data } = await api.post(
        "/stripe/create-checkout-session",
        paymentData
      );
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const verifyCheckoutSession = createAsyncThunk(
  "stripe/verifyCheckoutSession",
  async ({ sessionId, bookingId }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/stripe/verify-checkout-session", {
        sessionId,
        bookingId,
      });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────

const initialState = {
  sessionId: null,
  sessionUrl: null,
  loading: false,
  error: null,
};

const stripeSlice = createSlice({
  name: "stripe",
  initialState,
  reducers: {
    clearStripeError(state) {
      state.error = null;
    },
    resetStripeSession(state) {
      state.sessionId = null;
      state.sessionUrl = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createCheckoutSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCheckoutSession.fulfilled, (state, action) => {
        state.loading = false;
        state.sessionId = action.payload.sessionId;
        state.sessionUrl = action.payload.url;
      })
      .addCase(createCheckoutSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(verifyCheckoutSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyCheckoutSession.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(verifyCheckoutSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearStripeError, resetStripeSession } = stripeSlice.actions;

export default stripeSlice.reducer;
