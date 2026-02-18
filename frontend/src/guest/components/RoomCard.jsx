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
  offer = null,
}) {
  const navigate = useNavigate();

  const tags = room?.tags || [];

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

        {offer && (
          <div className="absolute left-3 top-3 flex flex-col gap-1">
            <span className="rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
              {offer.discount_type === "percentage" ? `${offer.discount_value}% OFF` : `$${offer.discount_value} OFF`}
            </span>
            {offer.tag_label && (
              <span className="rounded-full border border-amber-300 bg-amber-50/90 px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm backdrop-blur dark:border-amber-600 dark:bg-amber-900/80 dark:text-amber-300">
                {offer.tag_label}
              </span>
            )}
          </div>
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
          <span>{room.guests} guests</span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-ink dark:text-dark-ink">{room.title}</p>
          <StarsDisplay value={ratingAvg} count={ratingCount} className="shrink-0" />
        </div>

        {offer ? (() => {
          const original = room.price_per_day || room.price_per_hour || 0;
          const discounted = offer.discount_type === "percentage"
            ? original * (1 - offer.discount_value / 100)
            : Math.max(0, original - offer.discount_value);
          return (
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-semibold text-brand-700 dark:text-brand-400">
                {formatPrice(Math.round(discounted * 100) / 100)}
                <span className="text-xs font-normal text-muted dark:text-dark-muted">
                  /{room.price_per_day ? "day" : "hour"}
                </span>
              </p>
              <span className="text-sm text-muted line-through dark:text-dark-muted">{formatPrice(original)}</span>
            </div>
          );
        })() : (
          <p className="text-lg font-semibold text-brand-700 dark:text-brand-400">
            {formatPrice(room.price_per_day || room.price_per_hour || 0)}
            <span className="text-xs font-normal text-muted dark:text-dark-muted">
              /{room.price_per_day ? "day" : "hour"}
            </span>
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

