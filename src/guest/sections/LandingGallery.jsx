import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { formatPrice } from "../utils/format.js";
import { supabase } from "../../lib/supabaseClient.js";

const RoomCard = React.memo(({ room }) => {
  const navigate = useNavigate();

  // Handle tags - could be array or null from Supabase
  const tags = room.tags || [];

  return (
    <Card className="overflow-hidden p-0">
      {room.image && (
        <img
          src={room.image}
          alt={room.title}
          className="h-48 w-full object-cover"
          loading="lazy"
        />
      )}
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{room.location}</span>
          <span>{room.guests} guests</span>
        </div>
        <p className="text-sm font-semibold text-ink">{room.title}</p>
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
          items.map((room) => <RoomCard key={room.id} room={room} />)
        )}
      </div>
    </div>
  );
});

export default LandingGallery;
