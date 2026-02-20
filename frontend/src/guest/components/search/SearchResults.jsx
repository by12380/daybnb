import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useHits, usePagination } from "react-instantsearch";
import { useNavigate } from "react-router-dom";
import Card from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";
import { formatPrice } from "../../utils/format.js";
import { useAuth } from "../../../auth/useAuth.js";
import { fetchLikedRoomIds, likeRoom, unlikeRoom } from "../../utils/roomLikes.js";
import {
  getRoomAvailabilityStatus,
} from "../../utils/roomAvailability.js";

const HITS_PER_PAGE = 10;

function HeartIcon({ filled, className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.995 21s-7.5-4.35-9.77-8.78C.71 9.29 2.02 6.4 4.86 5.57c1.64-.48 3.41.02 4.65 1.27l2.49 2.52 2.49-2.52c1.24-1.25 3.01-1.75 4.65-1.27 2.84.83 4.15 3.72 2.63 6.65C19.495 16.65 11.995 21 11.995 21z"
      />
    </svg>
  );
}

function DistanceBadge({ distance }) {
  if (!distance && distance !== 0) return null;

  // Convert meters to km
  const km = distance / 1000;
  const displayDistance = km < 1 ? `${Math.round(distance)} m` : `${km.toFixed(1)} km`;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
      </svg>
      {displayDistance} away
    </span>
  );
}

function AvailabilityBadge({ status, message }) {
  if (!status) return null;

  const styles = {
    available: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    partially_booked: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    fully_booked: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  };

  const icons = {
    available: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    partially_booked: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    fully_booked: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}>
      {icons[status]}
      {message}
    </span>
  );
}

function StandoutBadges({ hit }) {
  const badges = [];
  if (hit.is_guest_favorite) badges.push({ label: "Guest favorite", cls: "from-amber-500 to-orange-500" });
  if (hit.is_luxe) badges.push({ label: "Luxe", cls: "from-purple-500 to-indigo-500" });
  if (badges.length === 0) return null;
  return (
    <div className="absolute left-3 top-3 flex flex-col gap-1">
      {badges.map((b) => (
        <span key={b.label} className={`rounded-full bg-gradient-to-r ${b.cls} px-2.5 py-1 text-[11px] font-bold text-white shadow-md`}>
          {b.label}
        </span>
      ))}
    </div>
  );
}

function PropertyMeta({ hit }) {
  const parts = [];
  if (hit.bedrooms) parts.push(`${hit.bedrooms} bd`);
  if (hit.beds) parts.push(`${hit.beds} beds`);
  if (hit.bathrooms) parts.push(`${hit.bathrooms} ba`);
  if (parts.length === 0) return null;
  return <span className="text-[10px] text-muted dark:text-dark-muted">{parts.join(" \u00b7 ")}</span>;
}

function SearchResultCard({ hit, onBook, liked, onToggleLike, availability }) {
  const tags = hit.tags || [];
  const amenities = hit.amenities || [];
  const isFullyBooked = availability?.status === "fully_booked";

  return (
    <Card className={`overflow-hidden p-0 transition-shadow hover:shadow-lg ${isFullyBooked ? "opacity-75" : ""}`}>
      <div className="relative">
        {hit.image && (
          <img
            src={hit.image}
            alt={hit.title}
            className={`h-48 w-full object-cover ${isFullyBooked ? "grayscale-[30%]" : ""}`}
            loading="lazy"
          />
        )}
        {/* Standout badges */}
        <StandoutBadges hit={hit} />
        {/* Distance badge overlay */}
        {hit._rankingInfo?.geoDistance !== undefined && !hit.is_guest_favorite && !hit.is_luxe && (
          <div className="absolute left-3 top-3">
            <DistanceBadge distance={hit._rankingInfo.geoDistance} />
          </div>
        )}
        {/* Fully booked overlay */}
        {isFullyBooked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
              Fully Booked
            </span>
          </div>
        )}
        {/* Like button */}
        <button
          type="button"
          onClick={() => onToggleLike(hit)}
          className={`absolute right-3 top-3 rounded-full border border-border bg-panel/90 p-2 shadow-sm backdrop-blur transition hover:bg-panel ${
            liked ? "text-rose-600 dark:text-rose-300" : "text-muted hover:text-ink"
          }`}
          aria-label={liked ? "Unlike room" : "Like room"}
          title={liked ? "Unlike" : "Like"}
        >
          <HeartIcon filled={liked} className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between text-xs text-muted dark:text-dark-muted">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {hit.location}
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {hit.guests} guests
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-ink dark:text-dark-ink">{hit.title}</p>
          {hit.type && (
            <span className="shrink-0 rounded-full bg-surface/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted dark:bg-dark-surface/80 dark:text-dark-muted">
              {hit.type}
            </span>
          )}
        </div>

        {/* Property meta: beds, bathrooms */}
        <PropertyMeta hit={hit} />

        {/* Booking option pills */}
        <div className="flex flex-wrap gap-1">
          {hit.instant_book && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Instant Book</span>
          )}
          {hit.allows_pets && (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">Pets OK</span>
          )}
          {hit.self_checkin && (
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Self check-in</span>
          )}
        </div>

        {/* Availability Badge */}
        {availability && (
          <AvailabilityBadge status={availability.status} message={availability.message} />
        )}

        <p className="text-lg font-semibold text-brand-700 dark:text-brand-400">
          {formatPrice(hit.price_per_day || 0)}
          <span className="text-xs font-normal text-muted dark:text-dark-muted">
            /day
          </span>
        </p>

        {/* Amenity highlights (top 4) */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {amenities.slice(0, 4).map((a) => (
              <span key={a} className="rounded-full border border-border bg-surface/60 px-2 py-0.5 text-[10px] text-muted dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted">
                {a.replace(/_/g, " ")}
              </span>
            ))}
            {amenities.length > 4 && (
              <span className="text-[10px] text-muted dark:text-dark-muted">+{amenities.length - 4} more</span>
            )}
          </div>
        )}

        {/* Tags (below amenities if present, otherwise shown as primary) */}
        {amenities.length === 0 && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full border border-border bg-surface/60 px-2 py-0.5 text-[10px] text-muted dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted">
                {tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="text-[10px] text-muted dark:text-dark-muted">+{tags.length - 4} more</span>
            )}
          </div>
        )}

        <Button
          onClick={() => onBook(hit)}
          className="mt-2 w-full"
          disabled={isFullyBooked}
        >
          {isFullyBooked ? "Not Available" : "Book Now"}
        </Button>
      </div>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
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

function EmptyState({ query }) {
  return (
    <Card className="py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
        <svg
          className="h-8 w-8 text-brand-600 dark:text-brand-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-ink dark:text-dark-ink">No places found</h3>
      <p className="mt-2 text-sm text-muted dark:text-dark-muted">
        {query
          ? `We couldn't find any places matching "${query}".`
          : "Try adjusting your filters or search criteria."}
      </p>
      <p className="mt-1 text-sm text-muted dark:text-dark-muted">
        Try a different location, date, or price range.
      </p>
    </Card>
  );
}

function ChevronLeftIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

// Custom Pagination UI Component for Algolia
function PaginationUI({ nbHits }) {
  const {
    currentRefinement,
    nbPages,
    isFirstPage,
    isLastPage,
    refine,
  } = usePagination();

  // Generate page numbers to display with ellipsis
  const pageNumbers = useMemo(() => {
    if (nbPages <= 7) {
      return Array.from({ length: nbPages }, (_, i) => i);
    }

    const current = currentRefinement;
    const pagesArr = [];

    // Always show first page
    pagesArr.push(0);

    // Calculate visible range around current page
    let start = Math.max(1, current - 1);
    let end = Math.min(nbPages - 2, current + 1);

    // Adjust if at the beginning
    if (current <= 2) {
      end = Math.min(4, nbPages - 2);
    }
    // Adjust if at the end
    if (current >= nbPages - 3) {
      start = Math.max(1, nbPages - 5);
    }

    // Add ellipsis before if needed
    if (start > 1) {
      pagesArr.push("...");
    }

    // Add visible page numbers
    for (let i = start; i <= end; i++) {
      pagesArr.push(i);
    }

    // Add ellipsis after if needed
    if (end < nbPages - 2) {
      pagesArr.push("...");
    }

    // Always show last page
    if (nbPages > 1) {
      pagesArr.push(nbPages - 1);
    }

    return pagesArr;
  }, [currentRefinement, nbPages]);

  if (nbPages <= 1) {
    return null;
  }

  const startItem = currentRefinement * HITS_PER_PAGE + 1;
  const endItem = Math.min((currentRefinement + 1) * HITS_PER_PAGE, nbHits);

  const handlePageClick = (page) => {
    console.log("Pagination: Clicking page", page, "Current:", currentRefinement);
    refine(page);
    // Scroll to top of results smoothly
    document.getElementById("geosearch")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col items-center gap-4 pt-6">
      {/* Page info */}
      <p className="text-sm text-muted dark:text-dark-muted">
        Showing{" "}
        <span className="font-medium text-ink dark:text-dark-ink">
          {startItem}-{endItem}
        </span>{" "}
        of{" "}
        <span className="font-medium text-ink dark:text-dark-ink">
          {nbHits}
        </span>{" "}
        places
      </p>

      {/* Pagination controls */}
      <nav className="flex items-center gap-1" aria-label="Pagination">
        {/* Previous button */}
        <button
          type="button"
          onClick={() => handlePageClick(currentRefinement - 1)}
          disabled={isFirstPage}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-panel text-muted transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-panel disabled:hover:text-muted dark:hover:border-brand-600 dark:hover:bg-brand-900/30 dark:hover:text-brand-400"
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) =>
            page === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="flex h-10 w-10 items-center justify-center text-muted dark:text-dark-muted"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => handlePageClick(page)}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition ${
                  page === currentRefinement
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20 dark:bg-brand-500 dark:shadow-black/25"
                    : "border border-border bg-panel text-ink hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:text-dark-ink dark:hover:border-brand-600 dark:hover:bg-brand-900/30 dark:hover:text-brand-400"
                }`}
                aria-label={`Page ${page + 1}`}
                aria-current={page === currentRefinement ? "page" : undefined}
              >
                {page + 1}
              </button>
            )
          )}
        </div>

        {/* Next button */}
        <button
          type="button"
          onClick={() => handlePageClick(currentRefinement + 1)}
          disabled={isLastPage}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-panel text-muted transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-panel disabled:hover:text-muted dark:hover:border-brand-600 dark:hover:bg-brand-900/30 dark:hover:text-brand-400"
          aria-label="Next page"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </nav>
    </div>
  );
}

function SearchResults({ selectedDate }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // useHits returns the hits for the current page - it automatically updates when pagination changes
  // In react-instantsearch v7, the property is called "items" not "hits"
  const { items, results } = useHits();

  const [likedIds, setLikedIds] = useState(() => new Set());
  const [sortOrder, setSortOrder] = useState("none");

  // Get search state from results
  const isLoading = !results;
  const query = results?.query || "";
  const nbHits = results?.nbHits || 0;

  // Fetch current user's liked room ids
  useEffect(() => {
    let cancelled = false;

    async function loadLikes() {
      if (!user?.id) {
        setLikedIds(new Set());
        return;
      }

      try {
        const set = await fetchLikedRoomIds();
        if (!cancelled) setLikedIds(set);
      } catch (e) {
        console.warn("Failed to load likes:", e);
      }
    }

    loadLikes();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const roomAvailability = useMemo(() => {
    if (!selectedDate || !items || items.length === 0) return {};

    const availability = {};
    for (const hit of items) {
      const bookedDates = hit.booked_dates || [];
      const isBooked = bookedDates.includes(selectedDate);
      availability[hit.objectID] = getRoomAvailabilityStatus(
        isBooked ? [{ id: hit.objectID }] : []
      );
    }
    return availability;
  }, [items, selectedDate]);

  const sortedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    if (sortOrder === "none") return items;

    const copy = [...items];
    copy.sort((a, b) => {
      const priceA = a.price_per_day ?? 0;
      const priceB = b.price_per_day ?? 0;
      return sortOrder === "asc" ? priceA - priceB : priceB - priceA;
    });
    return copy;
  }, [items, sortOrder]);

  const handleBook = useCallback(
    (hit) => {
      navigate(`/book/${hit.objectID}`);
    },
    [navigate]
  );

  const toggleLike = useCallback(
    async (hit) => {
      const roomId = hit.objectID;
      if (!roomId) return;
      
      if (!user?.id) {
        navigate("/auth");
        return;
      }

      const isLiked = likedIds.has(roomId);

      // Optimistic update
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(roomId);
        else next.add(roomId);
        return next;
      });

      try {
        if (isLiked) await unlikeRoom({ roomId });
        else await likeRoom({ roomId });
      } catch (e) {
        // Revert on failure
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (isLiked) next.add(roomId);
          else next.delete(roomId);
          return next;
        });
        console.warn("Failed to toggle like:", e);
      }
    },
    [likedIds, navigate, user?.id]
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (!items || items.length === 0) {
    return <EmptyState query={query} />;
  }

  return (
    <div className="space-y-4">
      {/* Results count + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted dark:text-dark-muted">
          Found <span className="font-semibold text-ink dark:text-dark-ink">{nbHits}</span>{" "}
          {nbHits === 1 ? "place" : "places"}
          {query && (
            <>
              {" "}
              for "<span className="font-medium text-ink dark:text-dark-ink">{query}</span>"
            </>
          )}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted dark:text-dark-muted">Sort by price</span>
          <button
            type="button"
            onClick={() => setSortOrder("asc")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              sortOrder === "asc"
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
                : "border-border bg-surface/60 text-muted hover:border-brand-200 hover:text-ink dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted dark:hover:border-brand-700"
            }`}
          >
            Low to High
          </button>
          <button
            type="button"
            onClick={() => setSortOrder("desc")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              sortOrder === "desc"
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
                : "border-border bg-surface/60 text-muted hover:border-brand-200 hover:text-ink dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted dark:hover:border-brand-700"
            }`}
          >
            High to Low
          </button>
          <button
            type="button"
            onClick={() => setSortOrder("none")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              sortOrder === "none"
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
                : "border-border bg-surface/60 text-muted hover:border-brand-200 hover:text-ink dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted dark:hover:border-brand-700"
            }`}
          >
            Default
          </button>
        </div>
      </div>

      {/* Date filter active indicator */}
      {selectedDate && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Showing availability for {selectedDate}
        </div>
      )}

      {/* Results grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedItems.map((hit) => (
          <SearchResultCard
            key={hit.objectID}
            hit={hit}
            onBook={handleBook}
            liked={likedIds.has(hit.objectID)}
            onToggleLike={toggleLike}
            availability={selectedDate ? roomAvailability[hit.objectID] : null}
          />
        ))}
      </div>

      {/* Pagination */}
      <PaginationUI nbHits={nbHits} />
    </div>
  );
}

export default SearchResults;
