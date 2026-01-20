import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { DAYTIME_END, DAYTIME_START, MIN_BOOKING_HOURS } from "../utils/constants.js";
import {
  bookingsToIntervals,
  buildTimeOptions,
  minutesToTimeValue,
  parseTimeToMinutes,
  rangeOverlapsAny,
  startHasAnyValidEnd,
} from "../utils/bookingTime.js";
import { useAuth } from "../../auth/useAuth.js";
import { supabase } from "../../lib/supabaseClient.js";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=60";

const TIME_STEP_MINUTES = 30;
const BOOKINGS_TABLE = "bookings";

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function normalizeTags(value, type) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return type ? [String(type)] : [];
}

const Booking = React.memo(() => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState(DAYTIME_START);
  const [endTime, setEndTime] = useState(DAYTIME_END);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [bookedIntervals, setBookedIntervals] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      setRoom(null);
      setSuccess("");

      if (!supabase) {
        setError(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        );
        return;
      }

      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message || "Failed to load room.");
        setLoading(false);
        return;
      }

      if (!data) {
        setError(
          "Room not found (or access denied by RLS). If the room exists in Supabase, add a SELECT policy for `rooms`."
        );
        setLoading(false);
        return;
      }

      setRoom(data);
      setLoading(false);
    }

    if (roomId) load();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    // Prefill from Supabase user metadata where possible.
    const nameFromMeta =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.display_name ||
      "";
    const phoneFromMeta = user?.phone || user?.user_metadata?.phone || "";
    setFullName((prev) => (prev ? prev : String(nameFromMeta || "")));
    setPhone((prev) => (prev ? prev : String(phoneFromMeta || "")));
  }, [user]);

  const tags = useMemo(() => normalizeTags(room?.tags, room?.type), [room?.tags, room?.type]);

  const allTimes = useMemo(
    () =>
      buildTimeOptions({
        start: DAYTIME_START,
        end: DAYTIME_END,
        stepMinutes: TIME_STEP_MINUTES,
      }),
    []
  );

  const daytimeStartMinutes = useMemo(() => parseTimeToMinutes(DAYTIME_START), []);
  const daytimeEndMinutes = useMemo(() => parseTimeToMinutes(DAYTIME_END), []);

  const startMinutes = useMemo(() => parseTimeToMinutes(startTime), [startTime]);
  const endMinutes = useMemo(() => parseTimeToMinutes(endTime), [endTime]);

  const startOptions = useMemo(() => {
    const lastStart = daytimeEndMinutes - TIME_STEP_MINUTES;
    const candidates = allTimes.filter(
      (t) => t.minutes >= daytimeStartMinutes && t.minutes <= lastStart
    );
    if (!date) return candidates.map((t) => ({ ...t, disabled: true }));
    return candidates.map((t) => {
      const minEndMinutes = t.minutes + MIN_BOOKING_HOURS * 60;
      const disabled =
        !startHasAnyValidEnd({
          start: t.minutes,
          minEnd: minEndMinutes,
          maxEnd: daytimeEndMinutes,
          stepMinutes: TIME_STEP_MINUTES,
          intervals: bookedIntervals,
        }) || false;
      return { ...t, disabled };
    });
  }, [allTimes, bookedIntervals, date, daytimeEndMinutes, daytimeStartMinutes]);

  const endOptions = useMemo(() => {
    const minEnd = startMinutes + MIN_BOOKING_HOURS * 60;
    const candidates = allTimes.filter((t) => t.minutes >= minEnd && t.minutes <= daytimeEndMinutes);
    if (!date) return candidates.map((t) => ({ ...t, disabled: true }));
    return candidates.map((t) => ({
      ...t,
      disabled: rangeOverlapsAny(startMinutes, t.minutes, bookedIntervals),
    }));
  }, [allTimes, bookedIntervals, date, daytimeEndMinutes, startMinutes]);

  useEffect(() => {
    // Keep end time valid if start time changes.
    const minEnd = startMinutes + MIN_BOOKING_HOURS * 60;
    if (endMinutes < minEnd) {
      setEndTime(minutesToTimeValue(minEnd));
    }
  }, [endMinutes, startMinutes]);

  useEffect(() => {
    let cancelled = false;

    async function loadBooked() {
      if (!supabase || !roomId || !date) {
        setBookedIntervals([]);
        setBookingsLoading(false);
        return;
      }

      setBookingsLoading(true);
      const { data, error: fetchError } = await supabase
        .from(BOOKINGS_TABLE)
        .select("id,start_time,end_time")
        .eq("room_id", roomId)
        .eq("booking_date", date);

      if (cancelled) return;

      if (fetchError) {
        console.warn("Failed to load existing bookings:", fetchError);
        setBookedIntervals([]);
      } else {
        setBookedIntervals(bookingsToIntervals(data));
      }
      setBookingsLoading(false);
    }

    loadBooked();
    return () => {
      cancelled = true;
    };
  }, [date, roomId]);

  useEffect(() => {
    if (!date) return;
    const selectedStart = startOptions.find((o) => o.value === startTime);
    if (!selectedStart || selectedStart.disabled) {
      const first = startOptions.find((o) => !o.disabled);
      if (first) setStartTime(first.value);
    }
  }, [date, startOptions, startTime]);

  useEffect(() => {
    if (!date) return;
    const selectedEnd = endOptions.find((o) => o.value === endTime);
    if (!selectedEnd || selectedEnd.disabled) {
      const first = endOptions.find((o) => !o.disabled);
      if (first) setEndTime(first.value);
    }
  }, [date, endOptions, endTime]);

  const durationText = useMemo(() => {
    const minutes = Math.max(0, endMinutes - startMinutes);
    const hours = minutes / 60;
    if (!Number.isFinite(hours) || hours <= 0) return "";
    return `${hours % 1 === 0 ? String(hours) : hours.toFixed(1)} hour${hours === 1 ? "" : "s"}`;
  }, [endMinutes, startMinutes]);

  const billableHours = useMemo(() => {
    const minutes = Math.max(0, endMinutes - startMinutes);
    const hours = minutes / 60;
    if (!Number.isFinite(hours) || hours <= 0) return 0;
    // UI uses 30-min increments; keep a stable numeric representation.
    return Math.round(hours * 100) / 100;
  }, [endMinutes, startMinutes]);

  const pricePerHour = useMemo(() => {
    const raw = room?.price_per_hour ?? room?.pricePerHour ?? null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [room?.pricePerHour, room?.price_per_hour]);

  const totalPrice = useMemo(() => {
    if (!pricePerHour || !billableHours) return 0;
    return Math.round(pricePerHour * billableHours * 100) / 100;
  }, [billableHours, pricePerHour]);

  const onDateChange = useCallback((_, dateString) => {
    setDate(dateString || "");
    setSuccess("");
    setError("");
  }, []);

  const onStartChange = useCallback((e) => {
    setStartTime(e.target.value);
    setSuccess("");
    setError("");
  }, []);

  const onEndChange = useCallback((e) => {
    setEndTime(e.target.value);
    setSuccess("");
    setError("");
  }, []);

  const onFullNameChange = useCallback((e) => setFullName(e.target.value), []);
  const onPhoneChange = useCallback((e) => setPhone(e.target.value), []);

  const validate = useCallback(() => {
    if (!roomId) return "Missing room id.";
    if (!user?.id) return "You must be signed in to book.";
    if (!date) return "Please select a date.";
    if (!pricePerHour) return "This room is missing an hourly rate. Please contact support.";
    const s = parseTimeToMinutes(startTime);
    const e = parseTimeToMinutes(endTime);
    const min = parseTimeToMinutes(DAYTIME_START);
    const max = parseTimeToMinutes(DAYTIME_END);
    if (s < min || s >= max) return "Start time must be between 8:00 AM and 5:00 PM.";
    if (e <= min || e > max) return "End time must be between 8:00 AM and 5:00 PM.";
    if (e <= s) return "End time must be after start time.";
    const durationMinutes = e - s;
    if (durationMinutes < MIN_BOOKING_HOURS * 60) {
      return `Minimum booking is ${MIN_BOOKING_HOURS} hours.`;
    }
    if (rangeOverlapsAny(s, e, bookedIntervals)) {
      return "That time range is already booked. Please select a different time window.";
    }
    return "";
  }, [bookedIntervals, date, endTime, pricePerHour, roomId, startTime, user?.id]);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setSuccess("");

      const message = validate();
      if (message) {
        setError(message);
        return;
      }

      if (!supabase) {
        setError(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        );
        return;
      }

      setSubmitting(true);
      setError("");

      // Re-check overlaps server-side just before insert.
      const { data: existing, error: existingError } = await supabase
        .from(BOOKINGS_TABLE)
        .select("id,start_time,end_time")
        .eq("room_id", roomId)
        .eq("booking_date", date);

      if (existingError) {
        setError(existingError.message || "Failed to validate availability.");
        setSubmitting(false);
        return;
      }

      const intervals = bookingsToIntervals(existing);
      const sMin = parseTimeToMinutes(startTime);
      const eMin = parseTimeToMinutes(endTime);
      if (rangeOverlapsAny(sMin, eMin, intervals)) {
        setError("That time range was just booked. Please pick another time window.");
        setSubmitting(false);
        return;
      }

      const payload = {
        room_id: roomId,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        user_id: user.id,
        user_email: user.email ?? null,
        user_full_name: fullName?.trim() || null,
        user_phone: phone?.trim() || null,
        price_per_hour: pricePerHour || null,
        billable_hours: billableHours || null,
        total_price: totalPrice || null,
      };

      const { data: inserted, error: insertError } = await supabase
        .from(BOOKINGS_TABLE)
        .insert(payload)
        .select("*")
        .maybeSingle();

      if (insertError) {
        const hint =
          insertError?.message?.toLowerCase?.().includes("does not exist") ||
          insertError?.message?.toLowerCase?.().includes("not found")
            ? `\n\nCreate a \`${BOOKINGS_TABLE}\` table with columns: room_id (text/uuid), booking_date (date), start_time (text/time), end_time (text/time), user_id (uuid/text), user_email (text), user_full_name (text), user_phone (text), price_per_hour (numeric), billable_hours (numeric), total_price (numeric).`
            : insertError?.message?.toLowerCase?.().includes("row level security") ||
                insertError?.message?.toLowerCase?.().includes("rls")
              ? `\n\nIf RLS is enabled, add an INSERT policy to \`${BOOKINGS_TABLE}\` for authenticated users.`
              : "";
        setError(`${insertError.message || "Failed to create booking."}${hint}`);
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setSuccess("Booking submitted! Redirecting to My Bookings…");
      const bookingId = inserted?.id;
      navigate(bookingId ? `/my-bookings?bookingId=${encodeURIComponent(bookingId)}` : "/my-bookings");
    },
    [
      date,
      endTime,
      fullName,
      navigate,
      phone,
      roomId,
      startTime,
      user?.email,
      user?.id,
      validate,
    ]
  );

  if (loading) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Loading room…</p>
        <p className="mt-1 text-sm text-muted">Fetching details from Supabase.</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Unable to load room</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
        <div className="mt-4">
          <Link to="/">
            <Button>Back to home</Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (!room) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Room not found</p>
        <p className="mt-1 text-sm text-muted">
          That room doesn’t exist. Go back to the homepage and pick another one.
        </p>
        <div className="mt-4">
          <Link to="/">
            <Button>Back to home</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card className="md:col-span-3 overflow-hidden p-0">
        <img
          src={room.image || FALLBACK_IMAGE}
          alt={room.title}
          className="h-56 w-full object-cover"
          loading="lazy"
        />
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Booking
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">{room.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {room.location} · Up to {room.guests} guests
          </p>
          <p className="mt-2 text-sm text-ink">
            <span className="text-muted">Hourly rate:</span>{" "}
            <span className="font-semibold">
              {pricePerHour ? `${formatMoney(pricePerHour)}/hr` : "—"}
            </span>
          </p>
          {tags.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-white px-2 py-0.5 text-[11px] text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="md:col-span-2">
        <p className="text-sm font-semibold text-ink">Book your daytime stay</p>
        <p className="mt-1 text-sm text-muted">
          Pick <span className="font-medium text-ink">one date</span> and a time window between{" "}
          <span className="font-medium text-ink">8:00 AM</span> and{" "}
          <span className="font-medium text-ink">5:00 PM</span>.
        </p>

        <form className="mt-4 space-y-4" onSubmit={onSubmit} noValidate>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Date</span>
            <DatePicker
              className={INPUT_STYLES}
              placeholder="Select date"
              value={date ? dayjs(date) : null}
              onChange={onDateChange}
              disabledDate={(current) => current && current < dayjs().startOf("day")}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted">Start time</span>
              <select
                value={startTime}
                onChange={onStartChange}
                className={INPUT_STYLES}
                disabled={!date || bookingsLoading}
              >
                {startOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted">End time</span>
              <select
                value={endTime}
                onChange={onEndChange}
                className={INPUT_STYLES}
                disabled={!date || bookingsLoading}
              >
                {endOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {date ? (
            <p className="text-xs text-muted">
              {bookingsLoading
                ? "Checking availability…"
                : "Unavailable time slots are disabled to prevent overlaps."}
            </p>
          ) : null}

          {durationText ? (
            <p className="text-xs text-muted">Total time: {durationText}</p>
          ) : null}

          {date && pricePerHour && billableHours ? (
            <p className="text-sm text-ink">
              Selected slot price: <span className="font-semibold">{formatMoney(totalPrice)}</span>
            </p>
          ) : null}

          {date ? (
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Price breakdown
              </p>
              {!pricePerHour ? (
                <p className="mt-2 text-sm text-muted">
                  Hourly price is not set for this room.
                </p>
              ) : !billableHours ? (
                <p className="mt-2 text-sm text-muted">Select a valid time window to see pricing.</p>
              ) : (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Hourly rate</span>
                    <span className="font-medium text-ink">
                      {formatMoney(pricePerHour)}/hr
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Hours</span>
                    <span className="font-medium text-ink">{billableHours}</span>
                  </div>
                  <div className="h-px w-full bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">Total</span>
                    <span className="font-semibold text-ink">{formatMoney(totalPrice)}</span>
                  </div>
                  <p className="text-xs text-muted">
                    Total is calculated from your selected time window (8:00 AM–5:00 PM).
                  </p>
                </div>
              )}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput
              label="Full name (optional)"
              value={fullName}
              onChange={onFullNameChange}
              placeholder="Ada Lovelace"
              autoComplete="name"
            />
            <FormInput
              label="Phone (optional)"
              value={phone}
              onChange={onPhoneChange}
              placeholder="+1 (555) 123-4567"
              autoComplete="tel"
            />
          </div>

          <p className="text-xs text-muted">
            Signed in as <span className="font-medium text-ink">{user?.email}</span>
          </p>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-green-700">{success}</p> : null}

          <div className="flex gap-3">
            <Link to="/">
              <Button variant="outline" type="button">
                Back
              </Button>
            </Link>
            <Button
              className="flex-1"
              type="submit"
              disabled={submitting || !date || !pricePerHour}
            >
              {submitting
                ? "Saving…"
                : totalPrice && date
                  ? `Book now · ${formatMoney(totalPrice)}`
                  : "Book now"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
});

export default Booking;

