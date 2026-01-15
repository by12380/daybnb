import React, { useCallback, useState } from "react";
import { DatePicker, TimePicker } from "antd";
import dayjs from "dayjs";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import {
  BOOKING_TYPES,
  DAYTIME_END,
  DAYTIME_START,
  MIN_BOOKING_HOURS,
} from "../utils/constants.js";

const LandingSearch = React.memo(({ onSearch }) => {
  const [bookingType, setBookingType] = useState("hourly");
  const [formState, setFormState] = useState({
    location: "",
    date: "",
    start: DAYTIME_START,
    end: DAYTIME_END,
    guests: 1,
  });

  const onTypeChange = useCallback((event) => {
    const value = event.target.value;
    setBookingType(value);
    setFormState((prev) => ({
      ...prev,
      start: value === "full-day" ? DAYTIME_START : prev.start,
      end: value === "full-day" ? DAYTIME_END : prev.end,
    }));
  }, []);

  const onChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onDateChange = useCallback((_, dateString) => {
    setFormState((prev) => ({ ...prev, date: dateString }));
  }, []);

  const onStartChange = useCallback((value) => {
    setFormState((prev) => ({
      ...prev,
      start: value ? value.format("HH:mm") : "",
    }));
  }, []);

  const onEndChange = useCallback((value) => {
    setFormState((prev) => ({
      ...prev,
      end: value ? value.format("HH:mm") : "",
    }));
  }, []);

  const onSubmit = useCallback(
    (event) => {
      event.preventDefault();
      if (onSearch) {
        onSearch({ ...formState, bookingType });
      }
    },
    [bookingType, formState, onSearch]
  );

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-brand-700">
          Find your daytime stay
        </h2>
        <p className="mt-1 text-sm text-muted">
          Book hourly or choose the full daytime window. Minimum{" "}
          {MIN_BOOKING_HOURS} hours.
        </p>
      </div>
      <form
        className="grid gap-4 md:grid-cols-6"
        onSubmit={onSubmit}
        noValidate
      >
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-medium text-muted">Location</span>
          <input
            name="location"
            value={formState.location}
            onChange={onChange}
            placeholder="City or neighborhood"
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm placeholder:text-muted/70 focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-200"
            type="text"
          />
        </label>
        <label className="flex flex-col gap-2 md:col-span-1">
          <span className="text-sm font-medium text-muted">Date</span>
          <DatePicker
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="Select date"
            value={formState.date ? dayjs(formState.date) : null}
            onChange={onDateChange}
          />
        </label>
        <label className="flex flex-col gap-2 md:col-span-1">
          <span className="text-sm font-medium text-muted">Booking</span>
          <select
            name="bookingType"
            value={bookingType}
            onChange={onTypeChange}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            {BOOKING_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 md:col-span-1">
          <span className="text-sm font-medium text-muted">Start</span>
          <TimePicker
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="Start time"
            value={formState.start ? dayjs(formState.start, "HH:mm") : null}
            format="HH:mm"
            onChange={onStartChange}
            disabled={bookingType === "full-day"}
          />
        </label>
        <label className="flex flex-col gap-2 md:col-span-1">
          <span className="text-sm font-medium text-muted">End</span>
          <TimePicker
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="End time"
            value={formState.end ? dayjs(formState.end, "HH:mm") : null}
            format="HH:mm"
            onChange={onEndChange}
            disabled={bookingType === "full-day"}
          />
        </label>
        <label className="flex flex-col gap-2 md:col-span-1">
          <span className="text-sm font-medium text-muted">Guests</span>
          <input
            name="guests"
            min="1"
            value={formState.guests}
            onChange={onChange}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm placeholder:text-muted/70 focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-200"
            type="number"
          />
        </label>
        <div className="md:col-span-6">
          <Button type="submit" className="w-full md:w-auto">
            Search daytime stays
          </Button>
        </div>
      </form>
    </Card>
  );
});

export default LandingSearch;
