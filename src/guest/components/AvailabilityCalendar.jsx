import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar } from "antd";
import dayjs from "dayjs";
import { supabase } from "../../lib/supabaseClient.js";

const BOOKINGS_TABLE = "bookings";

const AvailabilityCalendar = React.memo(function AvailabilityCalendar({
  roomId,
  selectedDate,
  onDateSelect,
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
      .select("id, booking_date, status")
      .eq("room_id", roomId)
      .gte("booking_date", startOfMonth)
      .lte("booking_date", endOfMonth)
      .in("status", ["pending", "approved", "confirmed"]);

    if (error) {
      console.error("Error fetching month bookings:", error);
      setMonthBookings({});
    } else {
      // Group bookings by date - just track if date is booked
      const grouped = {};
      (data || []).forEach((booking) => {
        grouped[booking.booking_date] = true;
      });
      setMonthBookings(grouped);
    }
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    fetchMonthBookings(currentMonth);
  }, [currentMonth, fetchMonthBookings]);

  // Check if a date is booked
  const isDateBooked = useCallback((date) => {
    const dateStr = date.format("YYYY-MM-DD");
    return !!monthBookings[dateStr];
  }, [monthBookings]);

  // Custom date cell renderer
  const dateCellRender = useCallback((date) => {
    const isPast = date.isBefore(dayjs(), "day");
    if (isPast) return null;

    const isBooked = isDateBooked(date);
    
    if (isBooked) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-red-500" title="Booked" />
        </div>
      );
    }

    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-green-500" title="Available" />
      </div>
    );
  }, [isDateBooked]);

  // Handle date selection
  const handleDateSelect = useCallback((date) => {
    if (date.isBefore(dayjs(), "day")) return;
    const dateStr = date.format("YYYY-MM-DD");
    // Check if date is already booked
    if (monthBookings[dateStr]) {
      return; // Don't allow selecting booked dates
    }
    onDateSelect?.(dateStr);
  }, [onDateSelect, monthBookings]);

  // Handle month change
  const handlePanelChange = useCallback((date) => {
    setCurrentMonth(date);
  }, []);

  // Disable booked dates and past dates
  const disabledDate = useCallback((current) => {
    if (!current) return false;
    // Disable past dates
    if (current < dayjs().startOf("day")) return true;
    // Disable already booked dates
    const dateStr = current.format("YYYY-MM-DD");
    return !!monthBookings[dateStr];
  }, [monthBookings]);

  return (
    <div className={`availability-calendar ${className}`}>
      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="text-muted dark:text-dark-muted">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-muted dark:text-dark-muted">Booked</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-xl border border-border bg-surface/40 p-2 dark:border-dark-border dark:bg-dark-surface/40">
        <Calendar
          fullscreen={false}
          value={selectedDate ? dayjs(selectedDate) : dayjs()}
          onSelect={handleDateSelect}
          onPanelChange={handlePanelChange}
          disabledDate={disabledDate}
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

      {/* Selected date info */}
      {selectedDate && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Selected: {dayjs(selectedDate).format("MMMM D, YYYY")}
          </p>
          <p className="mt-0.5 text-xs text-green-700 dark:text-green-300">
            This date is available for booking
          </p>
        </div>
      )}
    </div>
  );
});

export default AvailabilityCalendar;
