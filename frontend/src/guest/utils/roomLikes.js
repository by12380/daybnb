import { supabase } from "../../lib/supabaseClient.js";

export const ROOM_LIKES_TABLE = "room_likes";

export async function fetchLikedRoomIds(userId) {
  if (!supabase) throw new Error("Supabase not configured.");
  if (!userId) return new Set();

  const { data, error } = await supabase
    .from(ROOM_LIKES_TABLE)
    .select("room_id")
    .eq("user_id", userId);

  if (error) throw error;
  return new Set((data || []).map((r) => r.room_id).filter(Boolean));
}

export async function likeRoom({ userId, roomId }) {
  if (!supabase) throw new Error("Supabase not configured.");
  const { error } = await supabase.from(ROOM_LIKES_TABLE).insert({
    user_id: userId,
    room_id: roomId,
  });
  if (error) throw error;
}

export async function unlikeRoom({ userId, roomId }) {
  if (!supabase) throw new Error("Supabase not configured.");
  const { error } = await supabase
    .from(ROOM_LIKES_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("room_id", roomId);
  if (error) throw error;
}

