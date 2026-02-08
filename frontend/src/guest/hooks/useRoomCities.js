import { useMemo } from "react";
import { rooms } from "../data/rooms.js";

export default function useRoomCities() {
  const cities = useMemo(() => {
    const unique = new Set();
    rooms.forEach((room) => {
      const value = String(room?.location ?? "").trim();
      if (value) unique.add(value);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, []);

  return { cities, isLoading: false, error: null };
}

