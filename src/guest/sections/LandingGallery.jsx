import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import { useAuth } from "../../auth/useAuth.js";
import RoomCard from "../components/RoomCard.jsx";
import { fetchLikedRoomIds, likeRoom, unlikeRoom } from "../utils/roomLikes.js";
import { fetchRatingsForRooms } from "../utils/roomReviews.js";

const LandingGallery = React.memo(({ location = "", guests = 0 }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedIds, setLikedIds] = useState(() => new Set());
  const [ratingsByRoomId, setRatingsByRoomId] = useState({});

  // Fetch rooms from Supabase
  useEffect(() => {
    let isMounted = true;

    const fetchRooms = async () => {
      if (!supabase) {
        if (isMounted) {
          setError("Supabase not configured");
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("rooms")
          .select("*");

        if (!isMounted) return;

        if (fetchError) {
          console.error("Error fetching rooms:", fetchError);
          setError(fetchError.message);
        } else {
          setRooms(data || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Unexpected error:", err);
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRooms();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch current user's liked room ids
  useEffect(() => {
    let cancelled = false;

    async function loadLikes() {
      if (!user?.id || !supabase) {
        setLikedIds(new Set());
        return;
      }

      try {
        const set = await fetchLikedRoomIds(user.id);
        if (!cancelled) setLikedIds(set);
      } catch (e) {
        // Non-blocking
        console.warn("Failed to load likes:", e);
      }
    }

    loadLikes();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Fetch ratings summaries for the rooms we display
  useEffect(() => {
    let cancelled = false;

    async function loadRatings() {
      if (!supabase) return;
      const ids = (rooms || []).map((r) => r.id).filter(Boolean);
      if (!ids.length) {
        setRatingsByRoomId({});
        return;
      }

      try {
        const map = await fetchRatingsForRooms(ids);
        if (!cancelled) setRatingsByRoomId(map || {});
      } catch (e) {
        // Non-blocking
        console.warn("Failed to load ratings:", e);
      }
    }

    loadRatings();
    return () => {
      cancelled = true;
    };
  }, [rooms]);

  // Filter rooms based on search params
  const items = useMemo(() => {
    const locationQuery = location.toLowerCase().trim();
    const guestsQuery = Number(guests);

    return rooms.filter((room) => {
      const matchesLocation =
        !locationQuery ||
        room.location?.toLowerCase().includes(locationQuery) ||
        room.title?.toLowerCase().includes(locationQuery);
      const matchesGuests = !guestsQuery || room.guests >= guestsQuery;
      return matchesLocation && matchesGuests;
    });
  }, [rooms, location, guests]);

  const toggleLike = async (room) => {
    if (!room?.id) return;
    if (!user?.id) {
      navigate("/auth");
      return;
    }

    const isLiked = likedIds.has(room.id);

    // optimistic update
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(room.id);
      else next.add(room.id);
      return next;
    });

    try {
      if (isLiked) await unlikeRoom({ userId: user.id, roomId: room.id });
      else await likeRoom({ userId: user.id, roomId: room.id });
    } catch (e) {
      // revert on failure
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(room.id);
        else next.delete(room.id);
        return next;
      });
      console.warn("Failed to toggle like:", e);
    }
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-brand-700">
            Explore day-use spaces
          </h2>
          <p className="mt-1 text-sm text-muted">
            A quick preview of the types of rooms guests book during the day.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {loading ? (
          <Card className="md:col-span-2">
            <p className="text-sm text-muted">Loading rooms...</p>
          </Card>
        ) : error ? (
          <Card className="md:col-span-2">
            <p className="text-sm font-medium text-red-600">
              Failed to load rooms
            </p>
            <p className="mt-1 text-xs text-muted">{error}</p>
          </Card>
        ) : items.length === 0 ? (
          <Card className="md:col-span-2">
            <p className="text-sm font-medium text-ink">
              No rooms match your search.
            </p>
            <p className="mt-1 text-xs text-muted">
              Try a different location or fewer guests.
            </p>
          </Card>
        ) : (
          items.map((room) => {
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
          })
        )}
      </div>
    </div>
  );
});

export default LandingGallery;
