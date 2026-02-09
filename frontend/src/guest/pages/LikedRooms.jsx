import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../components/ui/Card.jsx";
import RoomCard from "../components/RoomCard.jsx";
import { useAuth } from "../../auth/useAuth.js";
import { fetchRooms } from "../../redux/slices/roomSlice.js";
import { fetchLikedRoomIds, likeRoom, unlikeRoom } from "../utils/roomLikes.js";
import { fetchRatingsForRooms } from "../utils/roomReviews.js";

const LikedRooms = React.memo(() => {
  const dispatch = useDispatch();
  const { user } = useAuth();

  const { rooms: allRooms, loading: roomsLoading } = useSelector((state) => state.rooms);

  const [likedIds, setLikedIds] = useState(() => new Set());
  const [ratingsByRoomId, setRatingsByRoomId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch all rooms via API and liked IDs
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      setLoading(true);

      if (!user?.id) {
        setError("You must be signed in to view liked rooms.");
        setLoading(false);
        return;
      }

      try {
        // Fetch liked room IDs via backend API
        const ids = await fetchLikedRoomIds();
        if (cancelled) return;
        setLikedIds(ids);

        // Fetch all rooms via backend API
        await dispatch(fetchRooms({ limit: 200 }));

        if (cancelled) return;
        setLoading(false);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load liked rooms.");
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [dispatch, user?.id]);

  // Filter rooms to only liked ones
  const likedRooms = useMemo(() => {
    if (!likedIds.size) return [];
    return (allRooms || []).filter((r) => likedIds.has(r.id));
  }, [allRooms, likedIds]);

  // Fetch ratings for liked rooms
  useEffect(() => {
    let cancelled = false;

    async function loadRatings() {
      const ids = likedRooms.map((r) => r.id).filter(Boolean);
      if (!ids.length) { setRatingsByRoomId({}); return; }

      try {
        const ratingMap = await fetchRatingsForRooms(ids);
        if (!cancelled) setRatingsByRoomId(ratingMap || {});
      } catch (e) {
        console.warn("Failed to load ratings:", e);
      }
    }

    loadRatings();
    return () => { cancelled = true; };
  }, [likedRooms]);

  const items = useMemo(() => {
    return [...likedRooms].sort((a, b) => String(a?.title || "").localeCompare(String(b?.title || "")));
  }, [likedRooms]);

  const toggleLike = async (room) => {
    if (!room?.id || !user?.id) return;

    const isLiked = likedIds.has(room.id);

    // optimistic update
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(room.id);
      else next.add(room.id);
      return next;
    });

    try {
      if (isLiked) await unlikeRoom({ roomId: room.id });
      else await likeRoom({ roomId: room.id });
    } catch (e) {
      console.warn("Failed to toggle like:", e);
    }
  };

  if (loading || roomsLoading) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Loading liked rooms...</p>
        <p className="mt-1 text-sm text-muted">Fetching your saved rooms.</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Couldn't load liked rooms</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Liked</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Liked rooms</h1>
        <p className="mt-1 text-sm text-muted">All the rooms you've saved for later.</p>
      </div>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm font-semibold text-ink">No liked rooms yet</p>
          <p className="mt-1 text-sm text-muted">Tap the heart on a room to save it.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((room) => {
            const rating = ratingsByRoomId?.[room.id] || { avg: 0, count: 0 };
            return (
              <RoomCard
                key={room.id}
                room={room}
                liked={likedIds.has(room.id)}
                onToggleLike={toggleLike}
                ratingAvg={rating.avg}
                ratingCount={rating.count}
                showLike
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

export default LikedRooms;
