import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import { useAuth } from "../../auth/useAuth.js";
import RoomCard from "../components/RoomCard.jsx";
import { getAlgoliaClient, getRoomsIndexName, isAlgoliaConfigured } from "../../lib/algoliaClient.js";
import { fetchLikedRoomIds, likeRoom, unlikeRoom } from "../utils/roomLikes.js";
import { fetchRatingsForRooms } from "../utils/roomReviews.js";
import { filterRoomsByBookings } from "../utils/availability.js";

function parseTimeToMinutes(value) {
  const [h, m] = String(value || "0:0")
    .split(":")
    .map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return Math.min(23, Math.max(0, h)) * 60 + Math.min(59, Math.max(0, m));
}

const LandingGallery = React.memo(({ searchParams }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedIds, setLikedIds] = useState(() => new Set());
  const [ratingsByRoomId, setRatingsByRoomId] = useState({});
  const [availabilityNote, setAvailabilityNote] = useState("");

  const queryText = String(searchParams?.query || "").trim();
  const locationQuery = String(searchParams?.location || "").toLowerCase().trim();
  const guestsQuery = Number(searchParams?.guests) || 0;
  const dateQuery = String(searchParams?.date || "").trim();
  const startTime = String(searchParams?.startTime || "08:00");
  const endTime = String(searchParams?.endTime || "17:00");

  // Fetch rooms from Algolia (GeoSearch) + validate availability via Supabase
  useEffect(() => {
    let isMounted = true;

    async function load() {
      setError(null);
      setAvailabilityNote("");
      setLoading(true);

      const algoliaReady = isAlgoliaConfigured();
      const lat = Number(searchParams?.lat);
      const lng = Number(searchParams?.lng);
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

      // If Algolia isn't configured or we don't have user coords, fall back to Supabase
      if (!algoliaReady || !hasCoords) {
        if (!supabase) {
          if (isMounted) {
            setError(
              !algoliaReady
                ? "Algolia is not configured. Set VITE_ALGOLIA_APP_ID, VITE_ALGOLIA_SEARCH_API_KEY, and VITE_ALGOLIA_ROOMS_INDEX."
                : "Supabase not configured."
            );
            setRooms([]);
            setLoading(false);
          }
          return;
        }

        try {
          const { data, error: fetchError } = await supabase.from("rooms").select("*");
          if (!isMounted) return;
          if (fetchError) {
            setError(fetchError.message || "Failed to load rooms.");
            setRooms([]);
            setLoading(false);
            return;
          }

          // Keep a similar UX even without GeoSearch
          const all = data || [];
          const filtered = all.filter((room) => {
            const searchText = queryText.toLowerCase();
            const matchesLocation =
              !locationQuery ||
              room.location?.toLowerCase().includes(locationQuery) ||
              room.title?.toLowerCase().includes(locationQuery);
            const matchesQuery =
              !searchText ||
              room.title?.toLowerCase().includes(searchText) ||
              room.location?.toLowerCase().includes(searchText) ||
              (Array.isArray(room.tags) &&
                room.tags.some((t) => String(t || "").toLowerCase().includes(searchText)));
            const matchesGuests = !guestsQuery || room.guests >= guestsQuery;
            return matchesLocation && matchesQuery && matchesGuests;
          });
          setRooms(filtered);
          setLoading(false);
          return;
        } catch (e) {
          if (!isMounted) return;
          setError(e?.message || "Failed to load rooms.");
          setRooms([]);
          setLoading(false);
          return;
        }
      }

      const client = getAlgoliaClient();
      if (!client) {
        if (isMounted) {
          setError("Algolia is not configured. Set VITE_ALGOLIA_APP_ID and VITE_ALGOLIA_SEARCH_API_KEY.");
          setRooms([]);
          setLoading(false);
        }
        return;
      }

      try {
        const numericFilters = [];

        if (guestsQuery > 0) numericFilters.push(`guests>=${guestsQuery}`);

        const minPrice = Number(searchParams?.minPrice);
        const maxPrice = Number(searchParams?.maxPrice);
        if (Number.isFinite(minPrice)) numericFilters.push(`price_per_hour>=${minPrice}`);
        if (Number.isFinite(maxPrice)) numericFilters.push(`price_per_hour<=${maxPrice}`);

        // Static “Daybnb hours” filters enforced via indexed fields
        const startM = parseTimeToMinutes(startTime);
        const endM = parseTimeToMinutes(endTime);
        numericFilters.push(`available_start_minutes<=${startM}`);
        numericFilters.push(`available_end_minutes>=${endM}`);

        const res = await client.search([
          {
            indexName: getRoomsIndexName(),
            query: queryText || "",
            params: {
              aroundLatLng: `${lat},${lng}`,
              // No distance filter UI; don't constrain by radius.
              aroundRadius: "all",
              hitsPerPage: 24,
              numericFilters,
              getRankingInfo: true,
            },
          },
        ]);

        const result = res?.results?.[0];

        let hits = (result?.hits || []).map((hit) => ({
          ...hit,
          id: hit.id || hit.objectID,
          distance_meters: hit?._rankingInfo?.geoDistance,
        }));

        // If “location” is supplied, tighten matches client-side too (keeps working even without faceting config)
        if (locationQuery) {
          hits = hits.filter((room) => {
            const loc = String(room?.location || "").toLowerCase();
            const title = String(room?.title || "").toLowerCase();
            return loc.includes(locationQuery) || title.includes(locationQuery);
          });
        }

        // Availability is dynamic (bookings) → validate against Supabase as source of truth
        if (dateQuery && supabase && hits.length) {
          setAvailabilityNote("Filtering out rooms already booked for your selected time window…");
          const ids = hits.map((r) => r.id).filter(Boolean);
          const { data: bookings, error: bookingsError } = await supabase
            .from("bookings")
            .select("room_id, booking_date, start_time, end_time")
            .in("room_id", ids)
            .eq("booking_date", dateQuery);

          if (!bookingsError) {
            hits = filterRoomsByBookings({
              rooms: hits,
              bookings: bookings || [],
              startTime,
              endTime,
            });
          }
          setAvailabilityNote("");
        }

        if (!isMounted) return;
        setRooms(hits);
        setLoading(false);
      } catch (e) {
        if (!isMounted) return;
        console.error("Algolia search failed:", e);
        setError(e?.message || "Search failed.");
        setRooms([]);
        setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [
    dateQuery,
    endTime,
    guestsQuery,
    locationQuery,
    queryText,
    searchParams?.lat,
    searchParams?.lng,
    searchParams?.maxPrice,
    searchParams?.minPrice,
    startTime,
  ]);

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

  const items = useMemo(() => rooms || [], [rooms]);

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
            Nearby results powered by Algolia GeoSearch (with bookings validated by Supabase).
          </p>
          {availabilityNote ? (
            <p className="mt-2 text-xs text-muted">{availabilityNote}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {loading ? (
          <Card className="md:col-span-2">
            <p className="text-sm text-muted">Searching rooms...</p>
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
              Try “Use my location”, widen the radius, or lower the guest/price filters.
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
