import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Card from "../components/ui/Card.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { fetchRooms } from "../../redux/slices/roomSlice.js";
import {
  AMENITIES,
  PROPERTY_TYPES,
  PLACE_TYPES,
  BOOKING_OPTIONS,
  STANDOUT_STAYS,
  toLabel,
} from "../utils/roomFilters.js";

const LandingSearch = React.memo(({ onSearch }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { rooms, loading: roomsLoading, error: roomsError } = useSelector((state) => state.rooms);

  const [formState, setFormState] = useState({
    searchText: "",
    location: "",
    date: "",
    guests: 1,
    minPrice: "",
    maxPrice: "",
    propertyType: "",
    placeType: "any",
    bookingOptions: [],
    standoutStays: [],
    amenities: [],
  });

  // Fetch rooms to extract unique cities
  useEffect(() => {
    dispatch(fetchRooms({ limit: 200 }));
  }, [dispatch]);

  // Extract unique cities from rooms
  const cities = React.useMemo(() => {
    return [
      ...new Set(
        (rooms || [])
          .map((room) => String(room?.location ?? "").trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [rooms]);

  // Keep legacy behavior: apply filters as user changes fields.
  useEffect(() => {
    onSearch?.(formState);
  }, [formState, onSearch]);

  const onChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onDateChange = useCallback((_, dateString) => {
    setFormState((prev) => ({ ...prev, date: dateString || "" }));
  }, []);

  const toggleListFilter = useCallback((key, value) => {
    setFormState((prev) => {
      const list = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = list.includes(value);
      return {
        ...prev,
        [key]: exists ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  }, []);

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-brand-700 dark:text-brand-400">
          {t("search.title")}
        </h2>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          {t("search.subtitle")}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-7">
      <FormInput
          label={t("search.searchLabel")}
          name="searchText"
          value={formState.searchText}
          onChange={onChange}
          type="search"
          placeholder={t("search.searchPlaceholder")}
          className="md:col-span-2"
        />
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-medium text-muted dark:text-dark-muted">{t("search.locationLabel")}</span>
          <select
            name="location"
            value={formState.location}
            onChange={onChange}
            className={INPUT_STYLES}
            disabled={roomsLoading || Boolean(roomsError)}
          >
            <option value="">
              {roomsLoading
                ? t("search.loadingCities")
                : roomsError
                  ? t("search.unableToLoadCities")
                  : t("search.allLocations")}
            </option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          {roomsError ? (
            <span className="text-xs text-red-600 dark:text-red-400">{roomsError}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-2 md:col-span-1">
          <span className="text-sm font-medium text-muted dark:text-dark-muted">{t("search.dateLabel")}</span>
          <DatePicker
            className={INPUT_STYLES}
            placeholder={t("search.selectDate")}
            value={formState.date ? dayjs(formState.date) : null}
            onChange={onDateChange}
            disabledDate={(current) => current && current < dayjs().startOf("day")}
            allowClear
          />
        </label>
       
        <FormInput
          label={t("search.minPrice")}
          name="minPrice"
          min="0"
          value={formState.minPrice}
          onChange={onChange}
          type="number"
          placeholder={t("search.noMin")}
          className="md:col-span-1"
        />
        <FormInput
          label={t("search.maxPrice")}
          name="maxPrice"
          min="0"
          value={formState.maxPrice}
          onChange={onChange}
          type="number"
          placeholder={t("search.noMax")}
          className="md:col-span-1"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted dark:text-dark-muted">Property type</span>
          <select
            name="propertyType"
            value={formState.propertyType}
            onChange={onChange}
            className={INPUT_STYLES}
          >
            <option value="">All types</option>
            {PROPERTY_TYPES.map((value) => (
              <option key={value} value={value}>
                {toLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted dark:text-dark-muted">Type of place</span>
          <select
            name="placeType"
            value={formState.placeType}
            onChange={onChange}
            className={INPUT_STYLES}
          >
            {PLACE_TYPES.map((value) => (
              <option key={value} value={value}>
                {toLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <FormInput
          label={t("search.guestsLabel", { defaultValue: "Guests" })}
          name="guests"
          min="1"
          value={formState.guests}
          onChange={onChange}
          type="number"
          className="md:col-span-1"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted dark:text-dark-muted">Booking options</p>
        <div className="flex flex-wrap gap-2">
          {BOOKING_OPTIONS.map((value) => {
            const selected = formState.bookingOptions.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleListFilter("bookingOptions", value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selected
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-border bg-surface/60 text-muted hover:border-brand-200 hover:text-ink dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted dark:hover:border-brand-700"
                }`}
              >
                {toLabel(value)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted dark:text-dark-muted">Standout stays</p>
        <div className="flex flex-wrap gap-2">
          {STANDOUT_STAYS.map((value) => {
            const selected = formState.standoutStays.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleListFilter("standoutStays", value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selected
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-border bg-surface/60 text-muted hover:border-brand-200 hover:text-ink dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted dark:hover:border-brand-700"
                }`}
              >
                {toLabel(value)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-muted dark:text-dark-muted">Amenities</p>
        {Object.entries(AMENITIES).map(([group, values]) => (
          <div key={group} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-dark-muted">
              {toLabel(group)}
            </p>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const selected = formState.amenities.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleListFilter("amenities", value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      selected
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
                        : "border-border bg-surface/60 text-muted hover:border-brand-200 hover:text-ink dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted dark:hover:border-brand-700"
                    }`}
                  >
                    {toLabel(value)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

export default LandingSearch;
