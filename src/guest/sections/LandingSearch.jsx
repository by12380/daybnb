import React, { useCallback, useEffect, useState } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import {
  BOOKING_TYPES,
  MIN_BOOKING_HOURS,
} from "../utils/constants.js";
import { supabase } from "../../lib/supabaseClient.js";

const LandingSearch = React.memo(({ onSearch }) => {
  const [bookingType, setBookingType] = useState("hourly");
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState("");
  const [formState, setFormState] = useState({
    location: "",
    date: "",
    guests: 1,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchCities = async () => {
      setCitiesError("");
      setCities([]);

      if (!supabase) {
        setCitiesError(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        );
        return;
      }

      setCitiesLoading(true);

      const { data, error } = await supabase.from("rooms").select("location");
      if (cancelled) return;

      if (error) {
        setCitiesError(error.message || "Failed to load locations.");
        setCitiesLoading(false);
        return;
      }

      // Extract unique cities
      const uniqueCities = [
        ...new Set(
          data
            .map((room) => String(room?.location ?? "").trim())
            .filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b));

      if (!uniqueCities.length) {
        setCitiesError(
          "No cities returned from Supabase. If RLS is enabled on `rooms`, add a SELECT policy for anon/authenticated users."
        );
      }

      setCities(uniqueCities);
      setCitiesLoading(false);
    };

    fetchCities();

    return () => {
      cancelled = true;
    };
  }, []);

  const onTypeChange = useCallback((event) => {
    setBookingType(event.target.value);
  }, []);

  const onChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onDateChange = useCallback((_, dateString) => {
    setFormState((prev) => ({ ...prev, date: dateString }));
  }, []);

  const onSubmit = useCallback(
    (event) => {
      event.preventDefault();
      onSearch?.({ ...formState, bookingType });
    },
    [bookingType, formState, onSearch]
  );

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-brand-700 dark:text-brand-400">
          Find your daytime stay
        </h2>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
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
          <span className="text-sm font-medium text-muted dark:text-dark-muted">Location</span>
          <select
            name="location"
            value={formState.location}
            onChange={onChange}
            className={INPUT_STYLES}
            disabled={citiesLoading || Boolean(citiesError)}
          >
            <option value="">
              {citiesLoading
                ? "Loading cities…"
                : citiesError
                  ? "Unable to load cities"
                  : "Select a city"}
            </option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          {citiesError ? (
            <span className="text-xs text-red-600 dark:text-red-400">{citiesError}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-2 md:col-span-1">
          <span className="text-sm font-medium text-muted dark:text-dark-muted">Date</span>
          <DatePicker
            className={INPUT_STYLES}
            placeholder="Select date"
            value={formState.date ? dayjs(formState.date) : null}
            onChange={onDateChange}
          />
        </label>
        <label className="flex flex-col gap-2 md:col-span-1">
          <span className="text-sm font-medium text-muted dark:text-dark-muted">Booking</span>
          <select
            name="bookingType"
            value={bookingType}
            onChange={onTypeChange}
            className={INPUT_STYLES}
          >
            {BOOKING_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <FormInput
          label="Guests"
          name="guests"
          min="1"
          value={formState.guests}
          onChange={onChange}
          type="number"
          className="md:col-span-1"
        />
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
