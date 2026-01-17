import React, { useCallback, useState } from "react";
import { DatePicker, TimePicker } from "antd";
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

const LandingSearch = React.memo(({ onSearch }) => {
  const [bookingType, setBookingType] = useState("hourly");
  const [formState, setFormState] = useState({
    location: "",
    date: "",
    start: DAYTIME_START,
    end: DAYTIME_END,
    guests: 1,
  });

  const isFullDay = bookingType === "full-day";

  const onTypeChange = useCallback((event) => {
    const value = event.target.value;
    setBookingType(value);
    if (value === "full-day") {
      setFormState((prev) => ({
        ...prev,
        start: DAYTIME_START,
        end: DAYTIME_END,
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

  const onTimeChange = useCallback((field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value ? value.format("HH:mm") : "",
    }));
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
        <FormInput
          label="Location"
          name="location"
          value={formState.location}
          onChange={onChange}
          placeholder="City or neighborhood"
          type="text"
          className="md:col-span-2"
        />
        <label className="flex flex-col gap-2 md:col-span-1">
          <span className="text-sm font-medium text-muted">Date</span>
          <DatePicker
            className={INPUT_STYLES}
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
            className={INPUT_STYLES}
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
            className={INPUT_STYLES}
            placeholder="Start time"
            value={formState.start ? dayjs(formState.start, "HH:mm") : null}
            format="HH:mm"
            onChange={(value) => onTimeChange("start", value)}
            disabled={isFullDay}
          />
        </label>
        <label className="flex flex-col gap-2 md:col-span-1">
          <span className="text-sm font-medium text-muted">End</span>
          <TimePicker
            className={INPUT_STYLES}
            placeholder="End time"
            value={formState.end ? dayjs(formState.end, "HH:mm") : null}
            format="HH:mm"
            onChange={(value) => onTimeChange("end", value)}
            disabled={isFullDay}
          />
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
