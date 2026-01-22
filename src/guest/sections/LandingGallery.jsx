import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { formatPrice } from "../utils/format.js";
import { supabase } from "../../lib/supabaseClient.js";
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
              <linearGradient id="halfStar">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#D1D5DB" />
              </linearGradient>
            </defs>
            <path
              fill="url(#halfStar)"
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

// Heart/Like Button Component
const LikeButton = React.memo(({ isLiked, onClick }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-white"
      aria-label={isLiked ? "Remove from favorites" : "Add to favorites"}
    >
      <svg
        className={`h-5 w-5 transition-colors ${
          isLiked ? "fill-red-500 text-red-500" : "fill-transparent text-gray-600"
        }`}
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

const RoomCard = React.memo(({ room, isLiked, onToggleLike, rating }) => {
  const navigate = useNavigate();

  // Handle tags - could be array or null from Supabase
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
        <LikeButton isLiked={isLiked} onClick={() => onToggleLike(room.id)} />
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
            {formatPrice(room.price_per_hour)}<span className="text-xs font-normal text-muted">/hour</span>
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

const LandingGallery = React.memo(({ location = "", guests = 0 }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Like functionality
  const { isLiked, toggleLike } = useLikedRooms();
  
  // Get room IDs for ratings
  const roomIds = useMemo(() => rooms.map((r) => r.id), [rooms]);
  const { ratings } = useRoomRatings(roomIds);

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
          items.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              isLiked={isLiked(room.id)}
              onToggleLike={toggleLike}
              rating={ratings[room.id]}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default LandingGallery;
