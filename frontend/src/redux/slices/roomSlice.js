import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// ─── Async Thunks ────────────────────────────────────────────

export const fetchRooms = createAsyncThunk(
  "rooms/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/rooms", { params });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchRoomById = createAsyncThunk(
  "rooms/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/rooms/${id}`);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createRoom = createAsyncThunk(
  "rooms/create",
  async (roomData, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/rooms", roomData);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateRoom = createAsyncThunk(
  "rooms/update",
  async ({ id, ...updates }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/rooms/${id}`, updates);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteRoom = createAsyncThunk(
  "rooms/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/rooms/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────

const initialState = {
  rooms: [],
  selectedRoom: null,
  total: 0,
  loading: false,
  error: null,
};

const roomSlice = createSlice({
  name: "rooms",
  initialState,
  reducers: {
    clearRoomError(state) {
      state.error = null;
    },
    clearSelectedRoom(state) {
      state.selectedRoom = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all rooms
    builder
      .addCase(fetchRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = action.payload.rooms;
        state.total = action.payload.total;
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch room by ID
    builder
      .addCase(fetchRoomById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoomById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedRoom = action.payload.room;
      })
      .addCase(fetchRoomById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create room
    builder
      .addCase(createRoom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms.unshift(action.payload.room);
        state.total += 1;
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update room
    builder
      .addCase(updateRoom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRoom.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.room;
        const idx = state.rooms.findIndex((r) => r.id === updated.id);
        if (idx !== -1) state.rooms[idx] = updated;
        if (state.selectedRoom?.id === updated.id) {
          state.selectedRoom = updated;
        }
      })
      .addCase(updateRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete room
    builder
      .addCase(deleteRoom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteRoom.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = state.rooms.filter((r) => r.id !== action.payload);
        state.total -= 1;
      })
      .addCase(deleteRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearRoomError, clearSelectedRoom } = roomSlice.actions;

export default roomSlice.reducer;
