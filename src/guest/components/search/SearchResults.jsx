import React, { useCallback, useEffect, useState } from "react";
import { useHits, useInstantSearch } from "react-instantsearch";
import { useNavigate } from "react-router-dom";
import Card from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";
import { formatPrice } from "../../utils/format.js";
import { useAuth } from "../../../auth/useAuth.js";
import { fetchLikedRoomIds, likeRoom, unlikeRoom } from "../../utils/roomLikes.js";
import { supabase } from "../../../lib/supabaseClient.js";

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

function SearchResultCard({ hit, onBook, liked, onToggleLike }) {
  const tags = hit.tags || [];

  return (
    <Card className="overflow-hidden p-0 transition-shadow hover:shadow-lg">
      <div className="relative">
        {hit.image && (
          <img
            src={hit.image}
            alt={hit.title}
            className="h-48 w-full object-cover"
            loading="lazy"
          />
        )}
        {/* Distance badge overlay */}
        {hit._rankingInfo?.geoDistance !== undefined && (
          <div className="absolute left-3 top-3">
            <DistanceBadge distance={hit._rankingInfo.geoDistance} />
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
            </svg>
            {hit.location}
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
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

        {hit.price_per_hour > 0 && (
          <p className="text-lg font-semibold text-brand-700 dark:text-brand-400">
            {formatPrice(hit.price_per_hour)}
            <span className="text-xs font-normal text-muted dark:text-dark-muted">/hour</span>
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-surface/60 px-2 py-0.5 text-[10px] text-muted dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted"
              >
                {tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="text-[10px] text-muted dark:text-dark-muted">
                +{tags.length - 4} more
              </span>
            )}
          </div>
        )}

        <Button onClick={() => onBook(hit)} className="mt-2 w-full">
          Book Now
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

const SearchResults = React.memo(function SearchResults() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items: hits } = useHits();
  const { status, results } = useInstantSearch();

  const [likedIds, setLikedIds] = useState(() => new Set());

  const isLoading = status === "loading" || status === "stalled";
  const query = results?.query || "";
  const nbHits = results?.nbHits || 0;

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
        console.warn("Failed to load likes:", e);
      }
    }

    loadLikes();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
        if (isLiked) await unlikeRoom({ userId: user.id, roomId });
        else await likeRoom({ userId: user.id, roomId });
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

  if (hits.length === 0) {
    return <EmptyState query={query} />;
  }

  return (
    <div className="space-y-4">
      {/* Results count */}
      <div className="flex items-center justify-between">
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
      </div>

      {/* Results grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {hits.map((hit) => (
          <SearchResultCard
            key={hit.objectID}
            hit={hit}
            onBook={handleBook}
            liked={likedIds.has(hit.objectID)}
            onToggleLike={toggleLike}
          />
        ))}
      </div>
    </div>
  );
});

export default SearchResults;
