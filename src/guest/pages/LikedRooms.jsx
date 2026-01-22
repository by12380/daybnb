import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { formatPrice } from "../utils/format.js";
import { supabase } from "../../lib/supabaseClient.js";
import { useAuth } from "../../auth/useAuth.js";
import { useLikedRooms } from "../hooks/useLikedRooms.js";
import { useRoomRatings } from "../hooks/useReviews.js";

// Star Rating Display Component
const StarRating = React.memo(({ rating, count, size = "sm" }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[...Array(fullStars)].map((_, i) => (
          <svg
            key={`full-${i}`}
            className={`${starSize} text-yellow-400`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        {hasHalfStar && (
          <svg
            className={`${starSize} text-yellow-400`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <defs>
              <linearGradient id="halfStarLiked">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#D1D5DB" />
              </linearGradient>
            </defs>
            <path
              fill="url(#halfStarLiked)"
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <svg
            key={`empty-${i}`}
            className={`${starSize} text-gray-300`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      {count !== undefined && (
        <span className="text-xs text-muted">
          {rating.toFixed(1)} ({count})
        </span>
      )}
    </div>
  );
});

// Heart/Unlike Button Component
const UnlikeButton = React.memo(({ onClick }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-white"
      aria-label="Remove from favorites"
    >
      <svg
        className="h-5 w-5 fill-red-500 text-red-500 transition-colors"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
});

const LikedRoomCard = React.memo(({ room, onUnlike, rating }) => {
  const navigate = useNavigate();

  const tags = room.tags || [];

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative">
        {room.image && (
          <img
            src={room.image}
            alt={room.title}
            className="h-48 w-full object-cover"
            loading="lazy"
          />
        )}
        <UnlikeButton onClick={() => onUnlike(room.id)} />
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{room.location}</span>
          <span>{room.guests} guests</span>
        </div>
        <p className="text-sm font-semibold text-ink">{room.title}</p>
        
        {/* Rating Display */}
        {rating && rating.average > 0 && (
          <StarRating rating={rating.average} count={rating.count} />
        )}
        
        {room.price_per_hour > 0 && (
          <p className="text-lg font-semibold text-brand-700">
            {formatPrice(room.price_per_hour)}
            <span className="text-xs font-normal text-muted">/hour</span>
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-white px-2 py-0.5 text-[11px] text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <Button
          onClick={() => navigate(`/book/${room.id}`)}
          className="mt-2 w-full"
        >
          Book Now
        </Button>
      </div>
    </Card>
  );
});

const LikedRooms = React.memo(() => {
  const { user, loading: authLoading } = useAuth();
  const { likedRoomIds, toggleLike, loading: likesLoading } = useLikedRooms();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get ratings for liked rooms
  const { ratings } = useRoomRatings(likedRoomIds);

  // Fetch room details for liked rooms
  useEffect(() => {
    if (likesLoading || authLoading) return;

    // If not signed in, don't fetch
    if (!user) {
      setRooms([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchLikedRooms() {
      if (likedRoomIds.length === 0) {
        setRooms([]);
        setLoading(false);
        return;
      }

      if (!supabase) {
        setError("Supabase not configured");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("rooms")
        .select("*")
        .in("id", likedRoomIds);

      if (cancelled) return;

      if (fetchError) {
        console.error("Error fetching liked rooms:", fetchError);
        setError(fetchError.message);
        setRooms([]);
      } else {
        setRooms(data || []);
      }

      setLoading(false);
    }

    fetchLikedRooms();

    return () => {
      cancelled = true;
    };
  }, [likedRoomIds, likesLoading, authLoading, user]);

  // Sort rooms to maintain order of liked rooms
  const sortedRooms = useMemo(() => {
    const roomMap = new Map(rooms.map((r) => [r.id, r]));
    return likedRoomIds
      .map((id) => roomMap.get(id))
      .filter(Boolean);
  }, [rooms, likedRoomIds]);

  if (authLoading || loading || likesLoading) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <p className="text-sm font-semibold text-ink">Loading your favorites...</p>
          <p className="mt-1 text-sm text-muted">Please wait while we fetch your liked rooms.</p>
        </Card>
      </div>
    );
  }

  // Show sign in prompt if not authenticated
  if (!user) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <svg
                className="h-8 w-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-ink">Sign in to see your favorites</p>
            <p className="mt-1 text-sm text-muted">
              Create an account or sign in to save and view your favorite rooms.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/auth">
                <Button>Sign In</Button>
              </Link>
              <Link to="/">
                <Button variant="outline">Browse Rooms</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <p className="text-sm font-semibold text-ink">Error loading favorites</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <div className="mt-4">
            <Link to="/">
              <Button>Browse Rooms</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Favorites
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Your Liked Rooms</h1>
          <p className="mt-1 text-sm text-muted">
            {sortedRooms.length === 0
              ? "You haven't liked any rooms yet"
              : `${sortedRooms.length} room${sortedRooms.length !== 1 ? "s" : ""} saved`}
          </p>
        </div>
        <Link to="/">
          <Button variant="outline">Browse Rooms</Button>
        </Link>
      </div>

      {/* Empty State */}
      {sortedRooms.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <svg
                className="h-8 w-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-ink">No favorites yet</p>
            <p className="mt-1 text-sm text-muted">
              Start exploring rooms and tap the heart icon to save your favorites.
            </p>
            <div className="mt-6">
              <Link to="/">
                <Button>Explore Rooms</Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedRooms.map((room) => (
            <LikedRoomCard
              key={room.id}
              room={room}
              onUnlike={toggleLike}
              rating={ratings[room.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default LikedRooms;
