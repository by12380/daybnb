import api from "../../redux/api.js";

export function summarizeRatings(rows) {
  const map = {};
  for (const r of rows || []) {
    const roomId = r.room_id;
    const rating = Number(r.rating);
    if (!roomId || !Number.isFinite(rating)) continue;
    if (!map[roomId]) map[roomId] = { sum: 0, count: 0 };
    map[roomId].sum += rating;
    map[roomId].count += 1;
  }
  const out = {};
  for (const [roomId, v] of Object.entries(map)) {
    out[roomId] = {
      avg: v.count ? v.sum / v.count : 0,
      count: v.count,
    };
  }
  return out;
}

export async function fetchRatingsForRooms(roomIds) {
  if (!roomIds?.length) return {};

  const { data } = await api.post("/reviews/ratings", {
    room_ids: roomIds,
  });

  return data.ratings || {};
}
