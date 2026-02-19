import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Card from "../components/ui/Card.jsx";
import { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { useAuth } from "../../auth/useAuth.js";
import RoomCard from "../components/RoomCard.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import { fetchRooms } from "../../redux/slices/roomSlice.js";
import { fetchActiveOffers } from "../../redux/slices/offerSlice.js";
import { fetchLikedRoomIds, likeRoom, unlikeRoom } from "../utils/roomLikes.js";
import { fetchRatingsForRooms } from "../utils/roomReviews.js";
import {
  PROPERTY_TYPES,
  PLACE_TYPES,
  BOOKING_OPTIONS,
  STANDOUT_STAYS,
  AMENITY_GROUPS,
  SAFETY_FEATURES,
} from "../utils/constants.js";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: "", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

// ─── Reusable filter UI pieces ──────────────────────────────

function Chip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
          : "border-border bg-surface/60 text-muted hover:border-brand-200 hover:text-ink dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted dark:hover:border-brand-700"
      }`}
    >
      {label}
    </button>
  );
}

function FilterSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border pt-3 dark:border-dark-border">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between">
        <span className="text-sm font-semibold text-ink dark:text-dark-ink">{title}</span>
        <svg className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex overflow-hidden rounded-xl border border-border dark:border-dark-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3 py-2 text-xs font-medium transition ${
            value === opt.value
              ? "bg-ink text-panel dark:bg-dark-ink dark:text-dark-panel"
              : "bg-panel text-muted hover:bg-surface/80 dark:bg-dark-panel dark:text-dark-muted"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Filter Panel ───────────────────────────────────────────

function GalleryFilters({ filters, onChange }) {
  const {
    date, minPrice, maxPrice, placeType, minBeds, minBathrooms,
    instantBook, selfCheckin, allowsPets, guestFavorite, luxe,
    selectedPropertyTypes, selectedAmenities, selectedSafety,
  } = filters;

  const set = (key, val) => onChange({ ...filters, [key]: val });
  const toggleInArray = (key, val) => {
    const arr = filters[key] || [];
    set(key, arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const activeCount = useMemo(() => {
    let c = 0;
    if (minPrice) c++;
    if (maxPrice) c++;
    if (placeType !== "any") c++;
    if (minBeds > 0) c++;
    if (minBathrooms > 0) c++;
    if (instantBook) c++;
    if (selfCheckin) c++;
    if (allowsPets) c++;
    if (guestFavorite) c++;
    if (luxe) c++;
    c += (selectedPropertyTypes || []).length;
    c += (selectedAmenities || []).length;
    c += (selectedSafety || []).length;
    return c;
  }, [filters]);

  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-panel p-4 dark:border-dark-border dark:bg-dark-panel">
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-semibold text-ink dark:text-dark-ink">Filters</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{activeCount}</span>
          )}
        </div>
        <svg className={`h-5 w-5 text-muted transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink dark:text-dark-ink">Date</label>
            <DatePicker
              className={INPUT_STYLES}
              placeholder="Select date"
              value={date ? dayjs(date) : null}
              onChange={(_, ds) => set("date", ds || "")}
              disabledDate={(cur) => cur && cur < dayjs().startOf("day")}
              allowClear
            />
          </div>

          {/* Type of Place */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink dark:text-dark-ink">Type of place</label>
            <SegmentedControl options={PLACE_TYPES} value={placeType} onChange={(v) => set("placeType", v)} />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-ink dark:text-dark-ink">Price/day</label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">$</span>
                <input type="number" min={0} value={minPrice} onChange={(e) => set("minPrice", e.target.value)} placeholder="Min"
                  className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 pl-5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink" />
              </div>
              <span className="text-xs text-muted">&ndash;</span>
              <div className="relative flex-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">$</span>
                <input type="number" min={0} value={maxPrice} onChange={(e) => set("maxPrice", e.target.value)} placeholder="Max"
                  className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 pl-5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink" />
              </div>
            </div>
          </div>

          {/* Beds & Baths */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink dark:text-dark-ink">Beds</label>
              <select value={minBeds} onChange={(e) => set("minBeds", Number(e.target.value))} className={INPUT_STYLES + " w-full"}>
                <option value={0}>Any</option>
                {[1,2,3,4,5,6,8].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink dark:text-dark-ink">Bathrooms</label>
              <select value={minBathrooms} onChange={(e) => set("minBathrooms", Number(e.target.value))} className={INPUT_STYLES + " w-full"}>
                <option value={0}>Any</option>
                {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </div>
          </div>

          {/* Booking Options */}
          <FilterSection title="Booking options" defaultOpen>
            <div className="flex flex-wrap gap-2">
              <Chip label="Instant Book" active={instantBook} onClick={() => set("instantBook", !instantBook)} />
              <Chip label="Self check-in" active={selfCheckin} onClick={() => set("selfCheckin", !selfCheckin)} />
              <Chip label="Allows pets" active={allowsPets} onClick={() => set("allowsPets", !allowsPets)} />
            </div>
          </FilterSection>

          {/* Standout Stays */}
          <FilterSection title="Standout stays" defaultOpen>
            <div className="flex flex-wrap gap-2">
              <Chip label="Guest favorite" active={guestFavorite} onClick={() => set("guestFavorite", !guestFavorite)} />
              <Chip label="Luxe" active={luxe} onClick={() => set("luxe", !luxe)} />
            </div>
          </FilterSection>

          {/* Property Type */}
          <FilterSection title="Property type" defaultOpen>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((pt) => (
                <Chip key={pt.value} label={pt.label} active={(selectedPropertyTypes || []).includes(pt.value)} onClick={() => toggleInArray("selectedPropertyTypes", pt.value)} />
              ))}
            </div>
          </FilterSection>

          {/* Amenities */}
          <FilterSection title="Amenities">
            {AMENITY_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <span className="text-xs font-semibold text-ink/60 dark:text-dark-ink/60">{group.label}</span>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <Chip key={item.value} label={item.label} active={(selectedAmenities || []).includes(item.value)} onClick={() => toggleInArray("selectedAmenities", item.value)} />
                  ))}
                </div>
              </div>
            ))}
          </FilterSection>

          {/* Safety */}
          <FilterSection title="Safety">
            <div className="flex flex-wrap gap-2">
              {SAFETY_FEATURES.map((item) => (
                <Chip key={item.value} label={item.label} active={(selectedSafety || []).includes(item.value)} onClick={() => toggleInArray("selectedSafety", item.value)} />
              ))}
            </div>
          </FilterSection>

          {/* Reset */}
          <button
            type="button"
            onClick={() => onChange({
              date: "", minPrice: "", maxPrice: "", placeType: "any",
              minBeds: 0, minBathrooms: 0, instantBook: false, selfCheckin: false,
              allowsPets: false, guestFavorite: false, luxe: false,
              selectedPropertyTypes: [], selectedAmenities: [], selectedSafety: [],
            })}
            className="w-full rounded-xl border border-border bg-surface/60 px-4 py-2 text-sm font-medium text-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted dark:hover:border-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Gallery ───────────────────────────────────────────

const INITIAL_FILTERS = {
  date: "", minPrice: "", maxPrice: "", placeType: "any",
  minBeds: 0, minBathrooms: 0, instantBook: false, selfCheckin: false,
  allowsPets: false, guestFavorite: false, luxe: false,
  selectedPropertyTypes: [], selectedAmenities: [], selectedSafety: [],
};

const LandingGallery = React.memo(
  ({ searchText = "", location = "", guests = 0 }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { rooms, total: totalCount, loading, error } = useSelector((state) => state.rooms);
  const { activeOffers } = useSelector((state) => state.offers);

  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("");
  const [likedIds, setLikedIds] = useState(() => new Set());
  const [ratingsByRoomId, setRatingsByRoomId] = useState({});
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [searchText, location, guests, sortOrder, filters]);

  useEffect(() => { dispatch(fetchActiveOffers()); }, [dispatch]);

  const offerByRoomId = useMemo(() => {
    const map = {};
    (activeOffers || []).forEach((offer) => {
      if (offer.room_id) {
        if (!map[offer.room_id] || offer.discount_value > map[offer.room_id].discount_value) {
          map[offer.room_id] = offer;
        }
      }
    });
    (rooms || []).forEach((room) => {
      if (!map[room.id] && room.owner_id) {
        const ownerOffer = (activeOffers || []).find((o) => o.owner_id === room.owner_id && !o.room_id);
        if (ownerOffer) map[room.id] = ownerOffer;
      }
      if (!map[room.id]) {
        const siteOffer = (activeOffers || []).find((o) => !o.room_id && !o.owner_id);
        if (siteOffer) map[room.id] = siteOffer;
      }
    });
    return map;
  }, [activeOffers, rooms]);

  // Fetch filtered rooms via API
  useEffect(() => {
    const offset = (currentPage - 1) * PAGE_SIZE;
    const params = { limit: PAGE_SIZE, offset };

    const queryParts = [searchText, location].map((v) => String(v || "").trim()).filter(Boolean);
    if (queryParts.length > 0) params.search = queryParts.join(" ");
    if (Number(guests) > 0) params.guests = Number(guests);
    if (sortOrder) params.sort = sortOrder;

    // New filter params
    if (filters.date) params.date = filters.date;
    if (filters.minPrice && Number(filters.minPrice) >= 0) params.min_price = Number(filters.minPrice);
    if (filters.maxPrice && Number(filters.maxPrice) >= 0) params.max_price = Number(filters.maxPrice);
    if (filters.placeType !== "any") params.place_type = filters.placeType;
    if (filters.minBeds > 0) params.min_beds = filters.minBeds;
    if (filters.minBathrooms > 0) params.min_bathrooms = filters.minBathrooms;
    if (filters.instantBook) params.instant_book = "true";
    if (filters.selfCheckin) params.self_checkin = "true";
    if (filters.allowsPets) params.allows_pets = "true";
    if (filters.guestFavorite) params.is_guest_favorite = "true";
    if (filters.luxe) params.is_luxe = "true";
    if (filters.selectedPropertyTypes?.length > 0) params.property_type = filters.selectedPropertyTypes.join(",");
    if (filters.selectedAmenities?.length > 0) params.amenities = filters.selectedAmenities.join(",");
    if (filters.selectedSafety?.length > 0) params.safety_features = filters.selectedSafety.join(",");

    dispatch(fetchRooms(params));
  }, [dispatch, currentPage, searchText, location, guests, sortOrder, filters]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadLikes() {
      if (!user?.id) { setLikedIds(new Set()); return; }
      try {
        const set = await fetchLikedRoomIds();
        if (!cancelled) setLikedIds(set);
      } catch (e) { console.warn("Failed to load likes:", e); }
    }
    loadLikes();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadRatings() {
      const ids = (rooms || []).map((r) => r.id).filter(Boolean);
      if (!ids.length) { setRatingsByRoomId({}); return; }
      try {
        const map = await fetchRatingsForRooms(ids);
        if (!cancelled) setRatingsByRoomId(map || {});
      } catch (e) { console.warn("Failed to load ratings:", e); }
    }
    loadRatings();
    return () => { cancelled = true; };
  }, [rooms]);

  const toggleLike = async (room) => {
    if (!room?.id) return;
    if (!user?.id) { navigate("/auth"); return; }
    const isLiked = likedIds.has(room.id);
    setLikedIds((prev) => { const next = new Set(prev); if (isLiked) next.delete(room.id); else next.add(room.id); return next; });
    try {
      if (isLiked) await unlikeRoom({ roomId: room.id });
      else await likeRoom({ roomId: room.id });
    } catch (e) {
      setLikedIds((prev) => { const next = new Set(prev); if (isLiked) next.add(room.id); else next.delete(room.id); return next; });
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

      {/* Filters + Results grid */}
      <div className="mt-4 grid gap-6 lg:grid-cols-4">
        {/* Sidebar filters */}
        <div className="lg:col-span-1">
          <GalleryFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Room grid */}
        <div className="lg:col-span-3">
          <div className="grid gap-4 md:grid-cols-2">
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
                <p className="text-sm font-medium text-ink dark:text-dark-ink">No rooms match your filters.</p>
                <p className="mt-1 text-xs text-muted dark:text-dark-muted">Try adjusting your filters or search criteria.</p>
              </Card>
            ) : (
              (rooms || []).map((room) => {
                const rating = ratingsByRoomId?.[room.id] || { avg: 0, count: 0 };
                return (
                  <RoomCard key={room.id} room={room} liked={likedIds.has(room.id)} onToggleLike={toggleLike} ratingAvg={rating.avg} ratingCount={rating.count} showLike offer={offerByRoomId[room.id] || null} />
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
      </div>
    </div>
  );
  }
);

export default LandingGallery;
