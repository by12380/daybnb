import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Card from "../components/ui/Card.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { fetchRooms } from "../../redux/slices/roomSlice.js";

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

  // Call onSearch whenever any filter changes
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
    </Card>
  );
});

export default LandingSearch;
