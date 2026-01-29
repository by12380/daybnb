import { supabase } from "../../lib/supabaseClient.js";

/**
 * Fetch all bookings for a specific room on a specific date
 */
export async function fetchRoomBookingsForDate(roomId, date) {
  if (!supabase || !roomId || !date) return [];

  const { data, error } = await supabase
    .from("bookings")
    .select("id, start_time, end_time, status")
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
 * Fetch bookings for multiple rooms on a specific date
 */
export async function fetchMultipleRoomsBookingsForDate(roomIds, date) {
  if (!supabase || !roomIds?.length || !date) return {};

  const { data, error } = await supabase
    .from("bookings")
    .select("id, room_id, start_time, end_time, status")
    .in("room_id", roomIds)
    .eq("booking_date", date)
    .in("status", ["pending", "approved", "confirmed"]);

  if (error) {
    console.error("Error fetching multiple room bookings:", error);
    return {};
  }

  // Group bookings by room_id
  const bookingsByRoom = {};
  (data || []).forEach((booking) => {
    if (!bookingsByRoom[booking.room_id]) {
      bookingsByRoom[booking.room_id] = [];
    }
    bookingsByRoom[booking.room_id].push(booking);
  });

  return bookingsByRoom;
}

/**
 * Parse time string (HH:MM) to minutes from midnight
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = String(timeStr).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Convert hour number to time string
 */
export function hourToTimeString(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

/**
 * Check if a time range overlaps with existing bookings
 */
export function isTimeRangeOverlapping(bookings, startMinutes, endMinutes) {
  for (const booking of bookings) {
    const bookingStart = parseTimeToMinutes(booking.start_time);
    const bookingEnd = parseTimeToMinutes(booking.end_time);
    
    // Two ranges overlap if start1 < end2 AND start2 < end1
    if (startMinutes < bookingEnd && bookingStart < endMinutes) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a room is available for a specific date and time range
 */
export function isRoomAvailable(bookings, startHour, endHour) {
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  return !isTimeRangeOverlapping(bookings, startMinutes, endMinutes);
}

/**
 * Get available time slots for a room on a specific date
 * Returns an array of { start, end } objects representing available slots
 */
export function getAvailableTimeSlots(bookings, daytimeStart = 8, daytimeEnd = 17) {
  if (!bookings || bookings.length === 0) {
    return [{ start: daytimeStart, end: daytimeEnd }];
  }

  // Sort bookings by start time
  const sortedBookings = [...bookings].sort((a, b) => {
    return parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time);
  });

  const availableSlots = [];
  let currentStart = daytimeStart * 60; // Convert to minutes
  const daytimeEndMinutes = daytimeEnd * 60;

  for (const booking of sortedBookings) {
    const bookingStart = parseTimeToMinutes(booking.start_time);
    const bookingEnd = parseTimeToMinutes(booking.end_time);

    // If there's a gap before this booking
    if (bookingStart > currentStart) {
      availableSlots.push({
        start: currentStart / 60,
        end: bookingStart / 60,
      });
    }

    // Move current start to after this booking
    currentStart = Math.max(currentStart, bookingEnd);
  }

  // Check if there's time after the last booking
  if (currentStart < daytimeEndMinutes) {
    availableSlots.push({
      start: currentStart / 60,
      end: daytimeEnd,
    });
  }

  return availableSlots;
}

/**
 * Format available slots as a readable string
 */
export function formatAvailableSlots(slots) {
  if (!slots || slots.length === 0) {
    return "Fully booked";
  }

  return slots
    .map((slot) => {
      const startH = slot.start > 12 ? slot.start - 12 : slot.start;
      const endH = slot.end > 12 ? slot.end - 12 : slot.end;
      const startSuffix = slot.start >= 12 ? "PM" : "AM";
      const endSuffix = slot.end >= 12 ? "PM" : "AM";
      return `${startH}${startSuffix}-${endH}${endSuffix}`;
    })
    .join(", ");
}

/**
 * Get booking status summary for a room
 */
export function getRoomAvailabilityStatus(bookings, startHour = 8, endHour = 17) {
  if (!bookings || bookings.length === 0) {
    return {
      status: "available",
      message: "Available all day",
      availableSlots: [{ start: startHour, end: endHour }],
    };
  }

  const availableSlots = getAvailableTimeSlots(bookings, startHour, endHour);
  const isAvailable = isRoomAvailable(bookings, startHour, endHour);

  if (availableSlots.length === 0) {
    return {
      status: "fully_booked",
      message: "Fully booked for this day",
      availableSlots: [],
    };
  }

  if (isAvailable) {
    return {
      status: "available",
      message: "Available for selected time",
      availableSlots,
    };
  }

  return {
    status: "partially_booked",
    message: `Available: ${formatAvailableSlots(availableSlots)}`,
    availableSlots,
  };
}
