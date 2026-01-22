import { supabase } from "../../lib/supabaseClient.js";

export const ROOM_REVIEWS_TABLE = "room_reviews";

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

export async function fetchReviewsForRoom(roomId) {
  if (!supabase) throw new Error("Supabase not configured.");
  const { data, error } = await supabase
    .from(ROOM_REVIEWS_TABLE)
    .select("id, room_id, user_id, user_full_name, user_email, rating, note, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchRatingsForRooms(roomIds) {
  if (!supabase) throw new Error("Supabase not configured.");
  if (!roomIds?.length) return {};

  const { data, error } = await supabase
    .from(ROOM_REVIEWS_TABLE)
    .select("room_id, rating")
    .in("room_id", roomIds);

  if (error) throw error;
  return summarizeRatings(data || []);
}

export async function upsertRoomReview(payload) {
  if (!supabase) throw new Error("Supabase not configured.");

  // Requires a UNIQUE constraint on (user_id, room_id) to work reliably.
  const { data, error } = await supabase
    .from(ROOM_REVIEWS_TABLE)
    .upsert(payload, { onConflict: "user_id,room_id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

