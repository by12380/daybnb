import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../../auth/useAuth.js";
import RoomCard from "../components/RoomCard.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import { fetchRooms } from "../../redux/slices/roomSlice.js";
import { fetchLikedRoomIds, likeRoom, unlikeRoom } from "../utils/roomLikes.js";
import { fetchRatingsForRooms } from "../utils/roomReviews.js";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: "", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const LandingGallery = React.memo(
  ({ location = "", guests = 0, date = "", minPrice = "", maxPrice = "" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    rooms,
    total: totalCount,
    loading,
    error,
  } = useSelector((state) => state.rooms);

  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("");
  const [likedIds, setLikedIds] = useState(() => new Set());
  const [ratingsByRoomId, setRatingsByRoomId] = useState({});

  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE);

  // Reset to first page whenever any filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [location, guests, date, minPrice, maxPrice, sortOrder]);

  // Fetch filtered rooms via API
  useEffect(() => {
    const offset = (currentPage - 1) * PAGE_SIZE;
    const params = { limit: PAGE_SIZE, offset };

    if (location?.trim()) params.search = location.trim();
    if (Number(guests) > 0) params.guests = Number(guests);
    if (date) params.date = date;
    if (minPrice !== "" && Number(minPrice) >= 0) params.min_price = Number(minPrice);
    if (maxPrice !== "" && Number(maxPrice) >= 0) params.max_price = Number(maxPrice);
    if (sortOrder) params.sort = sortOrder;

    dispatch(fetchRooms(params));
  }, [dispatch, currentPage, location, guests, date, minPrice, maxPrice, sortOrder]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch current user's liked room ids
  useEffect(() => {
    let cancelled = false;
    async function loadLikes() {
      if (!user?.id) { setLikedIds(new Set()); return; }
      try {
        const set = await fetchLikedRoomIds();
        if (!cancelled) setLikedIds(set);
      } catch (e) {
        console.warn("Failed to load likes:", e);
      }
    }
    loadLikes();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Fetch ratings for displayed rooms
  useEffect(() => {
    let cancelled = false;
    async function loadRatings() {
      const ids = (rooms || []).map((r) => r.id).filter(Boolean);
      if (!ids.length) { setRatingsByRoomId({}); return; }
      try {
        const map = await fetchRatingsForRooms(ids);
        if (!cancelled) setRatingsByRoomId(map || {});
      } catch (e) {
        console.warn("Failed to load ratings:", e);
      }
    }
    loadRatings();
    return () => { cancelled = true; };
  }, [rooms]);

  const toggleLike = async (room) => {
    if (!room?.id) return;
    if (!user?.id) { navigate("/auth"); return; }
    const isLiked = likedIds.has(room.id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(room.id); else next.add(room.id);
      return next;
    });
    try {
      if (isLiked) await unlikeRoom({ roomId: room.id });
      else await likeRoom({ roomId: room.id });
    } catch (e) {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(room.id); else next.delete(room.id);
        return next;
      });
      console.warn("Failed to toggle like:", e);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-brand-700 dark:text-brand-400">Explore day-use spaces</h2>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">A quick preview of the types of rooms guests book during the day.</p>
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted dark:text-dark-muted">Sort:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortOrder(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                sortOrder === opt.value
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
                  : "border-border bg-surface/60 text-muted hover:border-brand-200 hover:text-ink dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted dark:hover:border-brand-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden p-0">
              <div className="h-48 w-full animate-pulse bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-3 p-4">
                <div className="flex justify-between">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-6 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-10 w-full animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
            </Card>
          ))
        ) : error ? (
          <Card className="md:col-span-2">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed to load rooms</p>
            <p className="mt-1 text-xs text-muted dark:text-dark-muted">{error}</p>
          </Card>
        ) : (rooms || []).length === 0 ? (
          <Card className="md:col-span-2">
            <p className="text-sm font-medium text-ink dark:text-dark-ink">No rooms match your search.</p>
            <p className="mt-1 text-xs text-muted dark:text-dark-muted">
              {date
                ? "All rooms are booked on this date. Try a different date, location, or fewer guests."
                : "Try a different location or fewer guests."}
            </p>
          </Card>
        ) : (
          (rooms || []).map((room) => {
            const rating = ratingsByRoomId?.[room.id] || { avg: 0, count: 0 };
            return (
              <RoomCard key={room.id} room={room} liked={likedIds.has(room.id)} onToggleLike={toggleLike} ratingAvg={rating.avg} ratingCount={rating.count} showLike />
            );
          })
        )}
      </div>

      {!loading && !error && totalPages > 1 && (
        <div className="mt-8">
          <Pagination currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={handlePageChange} loading={loading} />
        </div>
      )}
    </div>
  );
  }
);

export default LandingGallery;
