import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import { useAuth } from "../../auth/useAuth.js";
import RoomCard from "../components/RoomCard.jsx";
import { fetchLikedRoomIds, likeRoom, unlikeRoom } from "../utils/roomLikes.js";
import { fetchRatingsForRooms } from "../utils/roomReviews.js";

const PAGE_SIZE = 10;

function escapePostgrestOrValue(value) {
  // PostgREST `.or(...)` uses commas as separators, so escape commas.
  // Keep it conservative; this is only for UX search input.
  return String(value || "").replaceAll(",", "\\,");
}

function GalleryLoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="animate-pulse overflow-hidden p-0">
          <div className="h-48 bg-surface dark:bg-dark-surface" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 rounded bg-surface dark:bg-dark-surface" />
            <div className="h-3 w-1/2 rounded bg-surface dark:bg-dark-surface" />
            <div className="h-6 w-1/3 rounded bg-surface dark:bg-dark-surface" />
            <div className="h-10 rounded bg-surface dark:bg-dark-surface" />
          </div>
        </Card>
      ))}
    </div>
  );
}

const LandingGallery = React.memo(({ location = "", guests = 0 }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const topRef = useRef(null);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedIds, setLikedIds] = useState(() => new Set());
  const [ratingsByRoomId, setRatingsByRoomId] = useState({});
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(null);

  const pageCacheRef = useRef(new Map());
  const likedIdsRef = useRef(likedIds);

  useEffect(() => {
    likedIdsRef.current = likedIds;
  }, [likedIds]);

  const locationQuery = useMemo(() => String(location || "").toLowerCase().trim(), [location]);
  const guestsQuery = useMemo(() => Number(guests) || 0, [guests]);

  // Reset paging + cache when filters change
  useEffect(() => {
    pageCacheRef.current.clear();
    setPage(0);
  }, [locationQuery, guestsQuery]);

  // When paging changes, scroll back to the top of the gallery so the new
  // page's first items are immediately visible.
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Defer until after layout updates to avoid jank.
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }, [page]);

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
        setLoading(true);
        setError(null);

        const cacheKey = JSON.stringify({
          locationQuery,
          guestsQuery,
          page,
          pageSize: PAGE_SIZE,
        });
        const cached = pageCacheRef.current.get(cacheKey);
        if (cached) {
          if (!isMounted) return;
          setRooms(cached.rooms || []);
          setTotalCount(
            typeof cached.totalCount === "number" ? cached.totalCount : cached.totalCount ?? null
          );
          setLoading(false);
          return;
        }

        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("rooms")
          .select("*", { count: "exact" })
          .order("id", { ascending: true })
          .range(from, to);

        if (locationQuery) {
          const safe = escapePostgrestOrValue(locationQuery);
          const pattern = `%${safe}%`;
          query = query.or(`location.ilike.${pattern},title.ilike.${pattern}`);
        }
        if (guestsQuery) {
          query = query.gte("guests", guestsQuery);
        }

        const { data, error: fetchError, count } = await query;

        if (!isMounted) return;

        if (fetchError) {
          console.error("Error fetching rooms:", fetchError);
          setError(fetchError.message);
          setRooms([]);
        } else {
          setRooms(data || []);
          setTotalCount(typeof count === "number" ? count : null);
          pageCacheRef.current.set(cacheKey, {
            rooms: data || [],
            totalCount: typeof count === "number" ? count : null,
          });
        }
      } catch (err) {
        if (isMounted) {
          console.error("Unexpected error:", err);
          setError(err.message);
          setRooms([]);
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
  }, [locationQuery, guestsQuery, page]);

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

  const items = rooms;

  console.log("items--------------------------------->", items);

  const toggleLike = useCallback(
    async (room) => {
      if (!room?.id) return;
      if (!user?.id) {
        navigate("/auth");
        return;
      }

      const isLiked = likedIdsRef.current.has(room.id);

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
    },
    [navigate, user?.id]
  );

  const totalPages = useMemo(() => {
    if (typeof totalCount !== "number") return null;
    return Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  }, [totalCount]);

  const canPrev = page > 0 && !loading;
  const canNext =
    !loading &&
    (totalPages ? page + 1 < totalPages : items.length === PAGE_SIZE && !error);

  const rangeLabel = useMemo(() => {
    if (!items.length) return null;
    const start = page * PAGE_SIZE + 1;
    const end = page * PAGE_SIZE + items.length;
    if (typeof totalCount === "number") return `Showing ${start}–${end} of ${totalCount}`;
    return `Showing ${start}–${end}`;
  }, [items.length, page, totalCount]);

  const handlePrev = useCallback(() => {
    if (!canPrev) return;
    setPage((p) => Math.max(0, p - 1));
  }, [canPrev]);

  const handleNext = useCallback(() => {
    if (!canNext) return;
    setPage((p) => p + 1);
  }, [canNext]);

  return (
    <div>
      <div ref={topRef} className="scroll-mt-24" />
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
      <div className="mt-4">
        {loading ? (
          <GalleryLoadingState />
        ) : error ? (
          <Card>
            <p className="text-sm font-medium text-red-600">Failed to load rooms</p>
            <p className="mt-1 text-xs text-muted">{error}</p>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <p className="text-sm font-medium text-ink">No rooms match your search.</p>
            <p className="mt-1 text-xs text-muted">Try a different location or fewer guests.</p>
          </Card>
        ) : (
          <>
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

            <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-xs text-muted">{rangeLabel}</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={!canPrev}
                  className="px-4 py-2 text-xs"
                >
                  Prev
                </Button>
                <div className="min-w-[7rem] text-center text-xs text-muted">
                  Page <span className="font-semibold text-ink">{page + 1}</span>
                  {totalPages ? (
                    <>
                      {" "}
                      of <span className="font-semibold text-ink">{totalPages}</span>
                    </>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={!canNext}
                  className="px-4 py-2 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default LandingGallery;
