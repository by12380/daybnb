import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/ui/Card.jsx";
import RoomCard from "../components/RoomCard.jsx";
import { useAuth } from "../../auth/useAuth.js";
import { supabase } from "../../lib/supabaseClient.js";
import { fetchLikedRoomIds, likeRoom, unlikeRoom } from "../utils/roomLikes.js";
import { fetchRatingsForRooms } from "../utils/roomReviews.js";

const LikedRooms = React.memo(() => {
  const { user } = useAuth();

  const [likedIds, setLikedIds] = useState(() => new Set());
  const [rooms, setRooms] = useState([]);
  const [ratingsByRoomId, setRatingsByRoomId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      setLoading(true);

      if (!supabase) {
        setError("Supabase not configured.");
        setLoading(false);
        return;
      }

      if (!user?.id) {
        setError("You must be signed in to view liked rooms.");
        setLoading(false);
        return;
      }

      try {
        const ids = await fetchLikedRoomIds(user.id);
        if (cancelled) return;
        setLikedIds(ids);

        const list = [...ids];
        if (!list.length) {
          setRooms([]);
          setRatingsByRoomId({});
          setLoading(false);
          return;
        }

        const { data: roomsData, error: roomsError } = await supabase
          .from("rooms")
          .select("*")
          .in("id", list);

        if (roomsError) throw roomsError;
        if (cancelled) return;

        const fetched = roomsData || [];
        setRooms(fetched);

        try {
          const ratingMap = await fetchRatingsForRooms(fetched.map((r) => r.id).filter(Boolean));
          if (!cancelled) setRatingsByRoomId(ratingMap || {});
        } catch (e) {
          console.warn("Failed to load ratings:", e);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load liked rooms.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const items = useMemo(() => {
    // Keep a stable ordering: newest like first would require created_at from room_likes.
    // For now, sort by title.
    return [...(rooms || [])].sort((a, b) => String(a?.title || "").localeCompare(String(b?.title || "")));
  }, [rooms]);

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
    setRooms((prev) => (isLiked ? (prev || []).filter((r) => r.id !== room.id) : prev));

    try {
      if (isLiked) await unlikeRoom({ userId: user.id, roomId: room.id });
      else await likeRoom({ userId: user.id, roomId: room.id });
    } catch (e) {
      console.warn("Failed to toggle like:", e);
    }
  };

  if (loading) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Loading liked rooms…</p>
        <p className="mt-1 text-sm text-muted">Fetching your saved rooms.</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Couldn’t load liked rooms</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Liked</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Liked rooms</h1>
        <p className="mt-1 text-sm text-muted">All the rooms you’ve saved for later.</p>
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

