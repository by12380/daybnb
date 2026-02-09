import api from "../../redux/api.js";

export async function fetchLikedRoomIds() {
  const { data } = await api.get("/likes");
  return new Set((data.room_ids || []).filter(Boolean));
}

export async function likeRoom({ roomId }) {
  await api.post("/likes", { room_id: roomId });
}

export async function unlikeRoom({ roomId }) {
  await api.delete(`/likes/${roomId}`);
}
