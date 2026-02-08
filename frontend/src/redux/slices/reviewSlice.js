import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// ─── Async Thunks ────────────────────────────────────────────

export const fetchReviewsByRoom = createAsyncThunk(
  "reviews/fetchByRoom",
  async (roomId, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/reviews", {
        params: { room_id: roomId },
      });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const upsertReview = createAsyncThunk(
  "reviews/upsert",
  async (reviewData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/reviews", reviewData);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteReview = createAsyncThunk(
  "reviews/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/reviews/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────

const initialState = {
  reviews: [],
  loading: false,
  error: null,
};

const reviewSlice = createSlice({
  name: "reviews",
  initialState,
  reducers: {
    clearReviewError(state) {
      state.error = null;
    },
    clearReviews(state) {
      state.reviews = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch reviews by room
    builder
      .addCase(fetchReviewsByRoom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviewsByRoom.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = action.payload.reviews;
      })
      .addCase(fetchReviewsByRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Upsert review
    builder
      .addCase(upsertReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(upsertReview.fulfilled, (state, action) => {
        state.loading = false;
        const review = action.payload.review;
        const idx = state.reviews.findIndex((r) => r.id === review.id);
        if (idx !== -1) {
          state.reviews[idx] = review;
        } else {
          state.reviews.unshift(review);
        }
      })
      .addCase(upsertReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete review
    builder
      .addCase(deleteReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = state.reviews.filter((r) => r.id !== action.payload);
      })
      .addCase(deleteReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearReviewError, clearReviews } = reviewSlice.actions;

export default reviewSlice.reducer;
