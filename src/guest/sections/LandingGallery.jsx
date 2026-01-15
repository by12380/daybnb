import React, { useMemo } from "react";
import Card from "../components/ui/Card.jsx";
import { rooms } from "../data/rooms.js";

const LandingGallery = React.memo(({ searchParams }) => {
  const items = useMemo(() => {
    const locationQuery = (searchParams?.location || "").toLowerCase().trim();
    const guestsQuery = Number(searchParams?.guests || 0);

    return rooms.filter((room) => {
      const matchesLocation =
        !locationQuery ||
        room.location.toLowerCase().includes(locationQuery) ||
        room.title.toLowerCase().includes(locationQuery);
      const matchesGuests = !guestsQuery || room.guests >= guestsQuery;
      return matchesLocation && matchesGuests;
    });
  }, [searchParams]);

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
        {items.length === 0 ? (
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
            <Card key={room.id} className="overflow-hidden p-0">
              <img
                src={room.image}
                alt={room.title}
                className="h-48 w-full object-cover"
                loading="lazy"
              />
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{room.location}</span>
                  <span>{room.guests} guests</span>
                </div>
                <p className="text-sm font-semibold text-ink">{room.title}</p>
                <div className="flex flex-wrap gap-2">
                  {room.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border bg-white px-2 py-0.5 text-[11px] text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
});

export default LandingGallery;
