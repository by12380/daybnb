import React, { useCallback, useEffect, useState } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import {
  BOOKING_TYPES,
  DAYTIME_END,
  DAYTIME_START,
  MIN_BOOKING_HOURS,
} from "../utils/constants.js";
import { supabase } from "../../lib/supabaseClient.js";

const DEFAULT_FORM_STATE = {
  query: "",
  location: "",
  date: "",
  guests: 1,
  minPrice: "",
  maxPrice: "",
  startTime: DAYTIME_START,
  endTime: DAYTIME_END,
  lat: null,
  lng: null,
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseTimeToMinutes(value) {
  const [h, m] = String(value || "0:0")
    .split(":")
    .map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return Math.min(23, Math.max(0, h)) * 60 + Math.min(59, Math.max(0, m));
}

function minutesToTimeValue(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function minutesToLabel(totalMinutes) {
  const h24 = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${pad2(m)} ${suffix}`;
}

function buildTimeOptions({ start, end, stepMinutes }) {
  const startM = parseTimeToMinutes(start);
  const endM = parseTimeToMinutes(end);
  const step = Math.max(5, Number(stepMinutes) || 30);
  const out = [];
  for (let m = startM; m <= endM; m += step) {
    out.push({ value: minutesToTimeValue(m), label: minutesToLabel(m), minutes: m });
  }
  return out;
}

const LandingSearch = React.memo(({ onSearch }) => {
  const [bookingType, setBookingType] = useState("hourly");
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [formState, setFormState] = useState(DEFAULT_FORM_STATE);

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
    const next = event.target.value;
    setBookingType(next);
    if (next === "full-day") {
      setFormState((prev) => ({
        ...prev,
        startTime: DAYTIME_START,
        endTime: DAYTIME_END,
      }));
    }
  }, []);

  const onChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onDateChange = useCallback((_, dateString) => {
    setFormState((prev) => ({ ...prev, date: dateString }));
  }, []);

  const requestGeolocation = useCallback(() => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormState((prev) => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(err?.message || "Unable to access your location.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const resetFilters = useCallback(() => {
    setGeoError("");
    setBookingType("hourly");
    // Preserve coordinates if user already shared location.
    setFormState((prev) => ({
      ...DEFAULT_FORM_STATE,
      lat: prev.lat,
      lng: prev.lng,
    }));
  }, []);

  const onSubmit = useCallback(
    (event) => {
      event.preventDefault();
      onSearch?.({
        ...formState,
        bookingType,
      });
    },
    [bookingType, formState, onSearch]
  );

  useEffect(() => {
    if (!onSearch) return;
    const t = setTimeout(() => {
      onSearch({
        ...formState,
        bookingType,
      });
    }, 250);
    return () => clearTimeout(t);
  }, [bookingType, formState, onSearch]);

  const timeOptions = buildTimeOptions({
    start: DAYTIME_START,
    end: DAYTIME_END,
    stepMinutes: 30,
  });

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
        <FormInput
          label="Search"
          name="query"
          value={formState.query}
          onChange={onChange}
          type="text"
          className="md:col-span-2"
          placeholder="Try “wifi”, “downtown”, “suite”…"
        />
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
        <FormInput
          label="Min $/hr"
          name="minPrice"
          min="0"
          value={formState.minPrice}
          onChange={onChange}
          type="number"
          className="md:col-span-1"
          placeholder="0"
        />
        <FormInput
          label="Max $/hr"
          name="maxPrice"
          min="0"
          value={formState.maxPrice}
          onChange={onChange}
          type="number"
          className="md:col-span-1"
          placeholder="150"
        />

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-medium text-muted dark:text-dark-muted">Time window</span>
          <div className="grid grid-cols-2 gap-2">
            <select
              name="startTime"
              value={formState.startTime}
              onChange={onChange}
              className={INPUT_STYLES}
              disabled={bookingType === "full-day"}
            >
              {timeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              name="endTime"
              value={formState.endTime}
              onChange={onChange}
              className={INPUT_STYLES}
              disabled={bookingType === "full-day"}
            >
              {timeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted dark:text-dark-muted">
            Daybnb hours are {minutesToLabel(parseTimeToMinutes(DAYTIME_START))}–{minutesToLabel(parseTimeToMinutes(DAYTIME_END))}.
          </p>
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-medium text-muted dark:text-dark-muted">Near me</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={requestGeolocation}
              disabled={geoLoading}
              className="whitespace-nowrap"
            >
              {geoLoading ? "Locating…" : formState.lat && formState.lng ? "Update my location" : "Use my location"}
            </Button>
          </div>
          {geoError ? (
            <span className="text-xs text-red-600 dark:text-red-400">{geoError}</span>
          ) : null}
        </label>

        <div className="md:col-span-6 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button type="submit" className="w-full sm:w-auto">
              Search
            </Button>
            <Button type="button" variant="outline" onClick={resetFilters} className="w-full sm:w-auto">
              Reset filters
            </Button>
          </div>
          <p className="text-xs text-muted dark:text-dark-muted">
            Results update automatically as you change filters.
          </p>
        </div>
      </form>
    </Card>
  );
});

export default LandingSearch;
