import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { DAYTIME_END, DAYTIME_START } from "../utils/constants.js";
import { useAuth } from "../../auth/useAuth.js";
import { supabase } from "../../lib/supabaseClient.js";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=60";

const TIME_STEP_MINUTES = 30;
const BOOKINGS_TABLE = "bookings";

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

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function parseTimeToMinutes(value) {
  const [h, m] = String(value || "0:0")
    .split(":")
    .map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return clamp(h, 0, 23) * 60 + clamp(m, 0, 59);
}

function pad2(n) {
  return String(n).padStart(2, "0");
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
  const mm = pad2(m);
  return `${h12}:${mm} ${suffix}`;
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

const Booking = React.memo(() => {
  const { roomId } = useParams();
  const { user } = useAuth();

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
    return allTimes.filter((t) => t.minutes >= daytimeStartMinutes && t.minutes <= lastStart);
  }, [allTimes, daytimeEndMinutes, daytimeStartMinutes]);

  const endOptions = useMemo(() => {
    const minEnd = startMinutes + TIME_STEP_MINUTES;
    return allTimes.filter((t) => t.minutes >= minEnd && t.minutes <= daytimeEndMinutes);
  }, [allTimes, daytimeEndMinutes, startMinutes]);

  useEffect(() => {
    // Keep end time valid if start time changes.
    const minEnd = startMinutes + TIME_STEP_MINUTES;
    if (endMinutes < minEnd) {
      const next = minutesToTimeValue(clamp(minEnd, daytimeStartMinutes, daytimeEndMinutes));
      setEndTime(next);
    }
  }, [daytimeEndMinutes, daytimeStartMinutes, endMinutes, startMinutes]);

  const durationText = useMemo(() => {
    const minutes = Math.max(0, endMinutes - startMinutes);
    const hours = minutes / 60;
    if (!Number.isFinite(hours) || hours <= 0) return "";
    return `${hours % 1 === 0 ? String(hours) : hours.toFixed(1)} hour${hours === 1 ? "" : "s"}`;
  }, [endMinutes, startMinutes]);

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
    const s = parseTimeToMinutes(startTime);
    const e = parseTimeToMinutes(endTime);
    const min = parseTimeToMinutes(DAYTIME_START);
    const max = parseTimeToMinutes(DAYTIME_END);
    if (s < min || s >= max) return "Start time must be between 8:00 AM and 5:00 PM.";
    if (e <= min || e > max) return "End time must be between 8:00 AM and 5:00 PM.";
    if (e <= s) return "End time must be after start time.";
    return "";
  }, [date, endTime, roomId, startTime, user?.id]);

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

      const payload = {
        room_id: roomId,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        user_id: user.id,
        user_email: user.email ?? null,
        user_full_name: fullName?.trim() || null,
        user_phone: phone?.trim() || null,
      };

      const { error: insertError } = await supabase.from(BOOKINGS_TABLE).insert(payload);

      if (insertError) {
        const hint =
          insertError?.message?.toLowerCase?.().includes("does not exist") ||
          insertError?.message?.toLowerCase?.().includes("not found")
            ? `\n\nCreate a \`${BOOKINGS_TABLE}\` table with columns: room_id (text/uuid), booking_date (date), start_time (text/time), end_time (text/time), user_id (uuid/text), user_email (text), user_full_name (text), user_phone (text).`
            : insertError?.message?.toLowerCase?.().includes("row level security") ||
                insertError?.message?.toLowerCase?.().includes("rls")
              ? `\n\nIf RLS is enabled, add an INSERT policy to \`${BOOKINGS_TABLE}\` for authenticated users.`
              : "";
        setError(`${insertError.message || "Failed to create booking."}${hint}`);
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setSuccess("Booking submitted! Your daytime reservation has been saved.");
    },
    [date, endTime, fullName, phone, roomId, startTime, user?.email, user?.id, validate]
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
              <select value={startTime} onChange={onStartChange} className={INPUT_STYLES}>
                {startOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted">End time</span>
              <select value={endTime} onChange={onEndChange} className={INPUT_STYLES}>
                {endOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {durationText ? (
            <p className="text-xs text-muted">Total time: {durationText}</p>
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
            <Button className="flex-1" type="submit" disabled={submitting || !date}>
              {submitting ? "Saving…" : "Book now"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
});

export default Booking;

