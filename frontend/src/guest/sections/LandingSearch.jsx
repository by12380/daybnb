import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { BOOKING_TYPES } from "../utils/constants.js";
import { fetchRooms } from "../../redux/slices/roomSlice.js";

const LandingSearch = React.memo(({ onSearch }) => {
  const dispatch = useDispatch();
  const { rooms, loading: roomsLoading, error: roomsError } = useSelector((state) => state.rooms);

  const [bookingType, setBookingType] = useState("hourly");
  const [formState, setFormState] = useState({
    location: "",
    date: "",
    guests: 1,
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
          Book a room for the day. Select your preferred date and location.
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
            disabled={roomsLoading || Boolean(roomsError)}
          >
            <option value="">
              {roomsLoading
                ? "Loading cities…"
                : roomsError
                  ? "Unable to load cities"
                  : "Select a city"}
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
