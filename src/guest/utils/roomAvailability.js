import { supabase } from "../../lib/supabaseClient.js";

/**
 * Fetch all bookings for a specific room on a specific date
 */
export async function fetchRoomBookingsForDate(roomId, date) {
  if (!supabase || !roomId || !date) return [];

  const { data, error } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("room_id", roomId)
    .eq("booking_date", date)
    .in("status", ["pending", "approved", "confirmed"]);

  if (error) {
    console.error("Error fetching room bookings:", error);
    return [];
  }

  return data || [];
}

/**
 * Check if a room is booked on a specific date
 */
export async function isRoomBookedOnDate(roomId, date) {
  const bookings = await fetchRoomBookingsForDate(roomId, date);
  return bookings.length > 0;
}

/**
 * Fetch bookings for multiple rooms on a specific date
 */
export async function fetchMultipleRoomsBookingsForDate(roomIds, date) {
  if (!supabase || !roomIds?.length || !date) return {};

  const { data, error } = await supabase
    .from("bookings")
    .select("id, room_id, status")
    .in("room_id", roomIds)
    .eq("booking_date", date)
    .in("status", ["pending", "approved", "confirmed"]);

  if (error) {
    console.error("Error fetching multiple room bookings:", error);
    return {};
  }

  // Group bookings by room_id - just track if room is booked on that date
  const bookingsByRoom = {};
  (data || []).forEach((booking) => {
    bookingsByRoom[booking.room_id] = true;
  });

  return bookingsByRoom;
}

/**
 * Check if a room is available on a specific date
 */
export function isRoomAvailable(bookings) {
  return !bookings || bookings.length === 0;
}

/**
 * Get booking status summary for a room on a date
 */
export function getRoomAvailabilityStatus(bookings) {
  if (!bookings || bookings.length === 0) {
    return {
      status: "available",
      message: "Available",
      isAvailable: true,
    };
  }

  return {
    status: "booked",
    message: "Booked",
    isAvailable: false,
  };
}
