import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Card from "./ui/Card.jsx";
import Button from "./ui/Button.jsx";
import { formatPrice } from "../utils/format.js";
import { StarsDisplay } from "./ui/Stars.jsx";

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

const RoomCard = React.memo(function RoomCard({
  room,
  liked = false,
  onToggleLike,
  ratingAvg = 0,
  ratingCount = 0,
  showLike = true,
}) {
  const navigate = useNavigate();

  const tags = room?.tags || [];
  const distanceMeters = Number(room?.distance_meters);
  const distanceLabel =
    Number.isFinite(distanceMeters) && distanceMeters > 0
      ? distanceMeters >= 1000
        ? `${(distanceMeters / 1000).toFixed(1)} km away`
        : `${Math.round(distanceMeters)} m away`
      : "";

  const handleToggle = useCallback(() => {
    onToggleLike?.(room);
  }, [onToggleLike, room]);

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

        {showLike && (
          <button
            type="button"
            onClick={handleToggle}
            className={`absolute right-3 top-3 rounded-full border border-border bg-panel/90 p-2 shadow-sm backdrop-blur transition hover:bg-panel ${
              liked ? "text-rose-600 dark:text-rose-300" : "text-muted hover:text-ink"
            }`}
            aria-label={liked ? "Unlike room" : "Like room"}
            title={liked ? "Unlike" : "Like"}
          >
            <HeartIcon filled={liked} className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between text-xs text-muted dark:text-dark-muted">
          <span>{room.location}</span>
          <span className="flex items-center gap-2">
            {distanceLabel ? <span className="rounded-full bg-surface/70 px-2 py-0.5">{distanceLabel}</span> : null}
            <span>{room.guests} guests</span>
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-ink dark:text-dark-ink">{room.title}</p>
          <StarsDisplay value={ratingAvg} count={ratingCount} className="shrink-0" />
        </div>

        {room.price_per_hour > 0 && (
          <p className="text-lg font-semibold text-brand-700 dark:text-brand-400">
            {formatPrice(room.price_per_hour)}
            <span className="text-xs font-normal text-muted dark:text-dark-muted">/hour</span>
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-surface/60 px-2 py-0.5 text-[11px] text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <Button onClick={() => navigate(`/book/${room.id}`)} className="mt-2 w-full">
          Book Now
        </Button>
      </div>
    </Card>
  );
});

export default RoomCard;

