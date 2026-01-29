import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar } from "antd";
import dayjs from "dayjs";
import { supabase } from "../../lib/supabaseClient.js";
import { DAYTIME_START, DAYTIME_END } from "../utils/constants.js";

const BOOKINGS_TABLE = "bookings";

// Time slot configuration
const TIME_SLOT_MINUTES = 30;
const DAYTIME_START_MINUTES = parseInt(DAYTIME_START.split(":")[0]) * 60;
const DAYTIME_END_MINUTES = parseInt(DAYTIME_END.split(":")[0]) * 60;

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = String(timeStr).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToLabel(totalMinutes) {
  const h24 = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// Generate time slots for the day
function generateTimeSlots() {
  const slots = [];
  for (let m = DAYTIME_START_MINUTES; m < DAYTIME_END_MINUTES; m += TIME_SLOT_MINUTES) {
    slots.push({
      minutes: m,
      label: minutesToLabel(m),
    });
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

const AvailabilityCalendar = React.memo(function AvailabilityCalendar({
  roomId,
  selectedDate,
  onDateSelect,
  onTimeSlotSelect,
  className = "",
}) {
  const [monthBookings, setMonthBookings] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  // Fetch bookings for the visible month
  const fetchMonthBookings = useCallback(async (month) => {
    if (!roomId || !supabase) return;

    setLoading(true);
    const startOfMonth = month.startOf("month").format("YYYY-MM-DD");
    const endOfMonth = month.endOf("month").format("YYYY-MM-DD");

    const { data, error } = await supabase
      .from(BOOKINGS_TABLE)
      .select("id, booking_date, start_time, end_time, status")
      .eq("room_id", roomId)
      .gte("booking_date", startOfMonth)
      .lte("booking_date", endOfMonth)
      .in("status", ["pending", "approved", "confirmed"]);

    if (error) {
      console.error("Error fetching month bookings:", error);
      setMonthBookings({});
    } else {
      // Group bookings by date
      const grouped = {};
      (data || []).forEach((booking) => {
        if (!grouped[booking.booking_date]) {
          grouped[booking.booking_date] = [];
        }
        grouped[booking.booking_date].push(booking);
      });
      setMonthBookings(grouped);
    }
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    fetchMonthBookings(currentMonth);
  }, [currentMonth, fetchMonthBookings]);

  // Get booked slots for a specific date
  const getBookedSlots = useCallback((date) => {
    const dateStr = date.format("YYYY-MM-DD");
    const bookings = monthBookings[dateStr] || [];
    const bookedMinutes = new Set();

    bookings.forEach((booking) => {
      const start = parseTimeToMinutes(booking.start_time);
      const end = parseTimeToMinutes(booking.end_time);
      for (let m = start; m < end; m += TIME_SLOT_MINUTES) {
        bookedMinutes.add(m);
      }
    });

    return bookedMinutes;
  }, [monthBookings]);

  // Calculate availability percentage for a date
  const getAvailabilityInfo = useCallback((date) => {
    const bookedSlots = getBookedSlots(date);
    const totalSlots = TIME_SLOTS.length;
    const bookedCount = bookedSlots.size;
    const availableCount = totalSlots - bookedCount;
    const percentage = Math.round((availableCount / totalSlots) * 100);

    return {
      bookedCount,
      availableCount,
      totalSlots,
      percentage,
      isFullyBooked: bookedCount >= totalSlots,
      isPartiallyBooked: bookedCount > 0 && bookedCount < totalSlots,
      isFullyAvailable: bookedCount === 0,
    };
  }, [getBookedSlots]);

  // Custom date cell renderer
  const dateCellRender = useCallback((date) => {
    const isPast = date.isBefore(dayjs(), "day");
    if (isPast) return null;

    const info = getAvailabilityInfo(date);
    
    if (info.isFullyBooked) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-red-500" title="Fully booked" />
        </div>
      );
    }
    
    if (info.isPartiallyBooked) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-amber-500" title={`${info.availableCount} slots available`} />
        </div>
      );
    }

    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-green-500" title="Available all day" />
      </div>
    );
  }, [getAvailabilityInfo]);

  // Handle date selection
  const handleDateSelect = useCallback((date) => {
    if (date.isBefore(dayjs(), "day")) return;
    onDateSelect?.(date.format("YYYY-MM-DD"));
  }, [onDateSelect]);

  // Handle month change
  const handlePanelChange = useCallback((date) => {
    setCurrentMonth(date);
  }, []);

  // Time slots for selected date
  const selectedDateSlots = useMemo(() => {
    if (!selectedDate) return [];
    const date = dayjs(selectedDate);
    const bookedSlots = getBookedSlots(date);
    
    return TIME_SLOTS.map((slot) => ({
      ...slot,
      isBooked: bookedSlots.has(slot.minutes),
    }));
  }, [selectedDate, getBookedSlots]);

  // Handle time slot click
  const handleTimeSlotClick = useCallback((slot) => {
    if (slot.isBooked) return;
    onTimeSlotSelect?.(slot);
  }, [onTimeSlotSelect]);

  return (
    <div className={`availability-calendar ${className}`}>
      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="text-muted dark:text-dark-muted">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-muted dark:text-dark-muted">Partially booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-muted dark:text-dark-muted">Fully booked</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-xl border border-border bg-surface/40 p-2 dark:border-dark-border dark:bg-dark-surface/40">
        <Calendar
          fullscreen={false}
          value={selectedDate ? dayjs(selectedDate) : dayjs()}
          onSelect={handleDateSelect}
          onPanelChange={handlePanelChange}
          disabledDate={(current) => current && current < dayjs().startOf("day")}
          cellRender={(current, info) => {
            if (info.type === "date") {
              return (
                <div className="relative h-full w-full">
                  {dateCellRender(current)}
                </div>
              );
            }
            return info.originNode;
          }}
        />
      </div>

      {loading && (
        <p className="mt-2 text-center text-xs text-muted dark:text-dark-muted">
          Loading availability...
        </p>
      )}

      {/* Time slots for selected date */}
      {selectedDate && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-ink dark:text-dark-ink">
            Time slots for {dayjs(selectedDate).format("MMMM D, YYYY")}
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {selectedDateSlots.map((slot) => (
              <button
                key={slot.minutes}
                type="button"
                onClick={() => handleTimeSlotClick(slot)}
                disabled={slot.isBooked}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                  slot.isBooked
                    ? "cursor-not-allowed border-red-200 bg-red-50 text-red-400 dark:border-red-800 dark:bg-red-900/20 dark:text-red-500"
                    : "cursor-pointer border-green-200 bg-green-50 text-green-700 hover:border-green-400 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 dark:hover:border-green-600"
                }`}
                title={slot.isBooked ? "Already booked" : "Available - Click to select"}
              >
                {slot.label}
              </button>
            ))}
          </div>
          
          {/* Summary */}
          {selectedDateSlots.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted dark:text-dark-muted">
              <span className="font-medium text-green-600 dark:text-green-400">
                {selectedDateSlots.filter(s => !s.isBooked).length} available
              </span>
              <span>·</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {selectedDateSlots.filter(s => s.isBooked).length} booked
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default AvailabilityCalendar;
