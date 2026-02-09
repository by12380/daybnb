import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Calendar } from "antd";
import dayjs from "dayjs";
import { fetchAvailability } from "../../redux/slices/bookingSlice.js";

const AvailabilityCalendar = React.memo(function AvailabilityCalendar({
  roomId,
  selectedDate,
  onDateSelect,
  className = "",
}) {
  const dispatch = useDispatch();
  const { bookedDates, loading } = useSelector((state) => state.bookings);
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  // Fetch booked dates for the room
  useEffect(() => {
    if (roomId) {
      dispatch(fetchAvailability(roomId));
    }
  }, [dispatch, roomId]);

  // Build a Set for fast lookup
  const bookedSet = useMemo(() => new Set(bookedDates || []), [bookedDates]);

  // Check if a date is booked
  const isDateBooked = useCallback((date) => {
    return bookedSet.has(date.format("YYYY-MM-DD"));
  }, [bookedSet]);

  // Custom date cell renderer
  const dateCellRender = useCallback((date) => {
    const isPast = date.isBefore(dayjs(), "day");
    if (isPast) return null;

    const isBooked = isDateBooked(date);
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`h-2 w-2 rounded-full ${isBooked ? "bg-red-500" : "bg-green-500"}`} title={isBooked ? "Booked" : "Available"} />
      </div>
    );
  }, [isDateBooked]);

  // Handle date selection
  const handleDateSelect = useCallback((date) => {
    if (date.isBefore(dayjs(), "day")) return;
    const dateStr = date.format("YYYY-MM-DD");
    if (bookedSet.has(dateStr)) return;
    onDateSelect?.(dateStr);
  }, [onDateSelect, bookedSet]);

  // Handle month change
  const handlePanelChange = useCallback((date) => {
    setCurrentMonth(date);
  }, []);

  // Disable booked dates and past dates
  const disabledDate = useCallback((current) => {
    if (!current) return false;
    if (current < dayjs().startOf("day")) return true;
    return bookedSet.has(current.format("YYYY-MM-DD"));
  }, [bookedSet]);

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
              return <div className="relative h-full w-full">{dateCellRender(current)}</div>;
            }
            return info.originNode;
          }}
        />
      </div>

      {loading && (
        <p className="mt-2 text-center text-xs text-muted dark:text-dark-muted">Loading availability...</p>
      )}

      {selectedDate && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Selected: {dayjs(selectedDate).format("MMMM D, YYYY")}
          </p>
          <p className="mt-0.5 text-xs text-green-700 dark:text-green-300">This date is available for booking</p>
        </div>
      )}
    </div>
  );
});

export default AvailabilityCalendar;
