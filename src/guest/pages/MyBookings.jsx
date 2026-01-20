import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { DAYTIME_END, DAYTIME_START } from "../utils/constants.js";
import {
  bookingsToIntervals,
  buildTimeOptions,
  parseTimeToMinutes,
  rangeOverlapsAny,
  startHasAnyValidEnd,
} from "../utils/bookingTime.js";
import { useAuth } from "../../auth/useAuth.js";
import { supabase } from "../../lib/supabaseClient.js";

const BOOKINGS_TABLE = "bookings";
const TIME_STEP_MINUTES = 30;
const MIN_BOOKING_HOURS = 2;

function getBookingKey(b) {
  if (!b) return "";
  if (b.id !== undefined && b.id !== null && String(b.id)) return String(b.id);
  // Fallback for schemas without an id column.
  return [
    b.room_id ?? "",
    b.booking_date ?? "",
    b.start_time ?? "",
    b.end_time ?? "",
    b.created_at ?? "",
  ].join("|");
}

function buildBookingMatch(b) {
  // Match fields used when id is not present.
  const match = {
    user_id: b.user_id,
    room_id: b.room_id,
    booking_date: b.booking_date,
    start_time: b.start_time,
    end_time: b.end_time,
  };
  if (b.created_at) match.created_at = b.created_at;
  return match;
}

function safeDateText(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

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

const MyBookings = React.memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState([]);
  const [roomsById, setRoomsById] = useState({});

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookedIntervals, setBookedIntervals] = useState([]);

  const selectedBookingId = searchParams.get("bookingId") || "";

  const selectedBooking = useMemo(() => {
    const b = bookings.find((x) => getBookingKey(x) === String(selectedBookingId));
    return b || bookings[0] || null;
  }, [bookings, selectedBookingId]);

  const selectedRoom = useMemo(() => {
    const roomId = selectedBooking?.room_id;
    return roomId ? roomsById[roomId] : null;
  }, [roomsById, selectedBooking?.room_id]);

  useEffect(() => {
    if (!selectedBooking) return;
    const key = getBookingKey(selectedBooking);
    if (!key) return;
    if (String(selectedBookingId) !== key) {
      setSearchParams({ bookingId: key }, { replace: true });
    }
  }, [selectedBooking, selectedBookingId, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      if (!supabase) {
        setError(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        );
        return;
      }
      if (!user?.id) return;

      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from(BOOKINGS_TABLE)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (fetchError) {
        const hint =
          fetchError?.message?.toLowerCase?.().includes("row level security") ||
          fetchError?.message?.toLowerCase?.().includes("rls")
            ? `\n\nIf RLS is enabled, add a SELECT policy to \`${BOOKINGS_TABLE}\` for authenticated users limited to their own rows.`
            : "";
        setError(`${fetchError.message || "Failed to load bookings."}${hint}`);
        setBookings([]);
        setLoading(false);
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      setBookings(rows);
      setLoading(false);

      const roomIds = [...new Set(rows.map((r) => r.room_id).filter(Boolean))];
      if (!roomIds.length) {
        setRoomsById({});
        return;
      }

      const { data: roomRows, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .in("id", roomIds);

      if (cancelled) return;

      if (roomError) {
        console.warn("Failed to load rooms for bookings:", roomError);
        setRoomsById({});
        return;
      }

      const map = {};
      (Array.isArray(roomRows) ? roomRows : []).forEach((r) => {
        map[r.id] = r;
      });
      setRoomsById(map);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const beginEdit = useCallback(() => {
    if (!selectedBooking) return;
    const key = getBookingKey(selectedBooking);
    setEditing(true);
    setError("");
    setBookedIntervals([]);
    setDraft({
      key,
      id: selectedBooking.id,
      room_id: selectedBooking.room_id,
      booking_date: selectedBooking.booking_date || "",
      start_time: selectedBooking.start_time || DAYTIME_START,
      end_time: selectedBooking.end_time || DAYTIME_END,
      user_full_name: selectedBooking.user_full_name || "",
      user_phone: selectedBooking.user_phone || "",
      original: {
        user_id: selectedBooking.user_id,
        room_id: selectedBooking.room_id,
        booking_date: selectedBooking.booking_date,
        start_time: selectedBooking.start_time,
        end_time: selectedBooking.end_time,
        created_at: selectedBooking.created_at,
      },
    });
  }, [selectedBooking]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft(null);
    setBookedIntervals([]);
    setBookingsLoading(false);
    setError("");
  }, []);

  const allTimes = useMemo(
    () =>
      buildTimeOptions({
        start: DAYTIME_START,
        end: DAYTIME_END,
        stepMinutes: TIME_STEP_MINUTES,
      }),
    []
  );

  const dayStartMinutes = useMemo(() => parseTimeToMinutes(DAYTIME_START), []);
  const dayEndMinutes = useMemo(() => parseTimeToMinutes(DAYTIME_END), []);

  const draftStartMinutes = useMemo(
    () => parseTimeToMinutes(draft?.start_time),
    [draft?.start_time]
  );
  const draftEndMinutes = useMemo(() => parseTimeToMinutes(draft?.end_time), [draft?.end_time]);

  const startOptions = useMemo(() => {
    const lastStart = dayEndMinutes - TIME_STEP_MINUTES;
    const candidates = allTimes.filter((t) => t.minutes >= dayStartMinutes && t.minutes <= lastStart);
    if (!draft?.booking_date) return candidates.map((t) => ({ ...t, disabled: true }));
    return candidates.map((t) => ({
      ...t,
      disabled: !startHasAnyValidEnd({
        start: t.minutes,
        minEnd: t.minutes + MIN_BOOKING_HOURS * 60,
        maxEnd: dayEndMinutes,
        stepMinutes: TIME_STEP_MINUTES,
        intervals: bookedIntervals,
      }),
    }));
  }, [allTimes, bookedIntervals, dayEndMinutes, dayStartMinutes, draft?.booking_date]);

  const endOptions = useMemo(() => {
    const minEnd = draftStartMinutes + MIN_BOOKING_HOURS * 60;
    const candidates = allTimes.filter((t) => t.minutes >= minEnd && t.minutes <= dayEndMinutes);
    if (!draft?.booking_date) return candidates.map((t) => ({ ...t, disabled: true }));
    return candidates.map((t) => ({
      ...t,
      disabled: rangeOverlapsAny(draftStartMinutes, t.minutes, bookedIntervals),
    }));
  }, [allTimes, bookedIntervals, dayEndMinutes, draft?.booking_date, draftStartMinutes]);

  useEffect(() => {
    if (!editing || !draft?.booking_date || !draft?.room_id) return;
    let cancelled = false;

    async function loadBooked() {
      if (!supabase) return;
      setBookingsLoading(true);
      const { data, error: fetchError } = await supabase
        .from(BOOKINGS_TABLE)
        .select("id,user_id,created_at,start_time,end_time")
        .eq("room_id", draft.room_id)
        .eq("booking_date", draft.booking_date);

      if (cancelled) return;

      if (fetchError) {
        console.warn("Failed to load existing bookings:", fetchError);
        setBookedIntervals([]);
      } else {
        const rows = Array.isArray(data) ? data : [];
        const filtered =
          draft?.id !== undefined && draft?.id !== null
            ? rows.filter((r) => String(r.id) !== String(draft.id))
            : rows.filter((r) => {
                // Exclude the current booking when the schema has no id.
                const sameUser = String(r.user_id || "") === String(user.id || "");
                const sameCreated =
                  draft?.original?.created_at && r.created_at
                    ? String(r.created_at) === String(draft.original.created_at)
                    : true;
                const sameTimes =
                  String(r.start_time || "") === String(draft?.original?.start_time || "") &&
                  String(r.end_time || "") === String(draft?.original?.end_time || "");
                return !(sameUser && sameTimes && sameCreated);
              });
        setBookedIntervals(bookingsToIntervals(filtered));
      }
      setBookingsLoading(false);
    }

    loadBooked();
    return () => {
      cancelled = true;
    };
  }, [draft?.booking_date, draft?.id, draft?.original?.created_at, draft?.room_id, editing, user.id]);

  useEffect(() => {
    if (!editing || !draft?.booking_date) return;
    const selectedStart = startOptions.find((o) => o.value === draft?.start_time);
    if (!selectedStart || selectedStart.disabled) {
      const first = startOptions.find((o) => !o.disabled);
      if (first) setDraft((d) => (d ? { ...d, start_time: first.value } : d));
    }
  }, [draft?.booking_date, draft?.start_time, editing, startOptions]);

  useEffect(() => {
    if (!editing || !draft?.booking_date) return;
    const selectedEnd = endOptions.find((o) => o.value === draft?.end_time);
    if (!selectedEnd || selectedEnd.disabled) {
      const first = endOptions.find((o) => !o.disabled);
      if (first) setDraft((d) => (d ? { ...d, end_time: first.value } : d));
    }
  }, [draft?.booking_date, draft?.end_time, editing, endOptions]);

  const onCancelBooking = useCallback(async () => {
    if (!selectedBooking) return;
    if (!supabase) return;
    const ok = window.confirm("Cancel this booking? This cannot be undone.");
    if (!ok) return;

    setSaving(true);
    setError("");
    const hasId = selectedBooking.id !== undefined && selectedBooking.id !== null;
    const deleteQuery = supabase.from(BOOKINGS_TABLE).delete().select("*");
    const { data: deletedRows, error: delError } = hasId
      ? await deleteQuery.eq("id", selectedBooking.id).eq("user_id", user.id)
      : await deleteQuery.match(buildBookingMatch(selectedBooking));

    if (delError) {
      const hint =
        delError?.message?.toLowerCase?.().includes("row level security") ||
        delError?.message?.toLowerCase?.().includes("rls")
          ? `\n\nIf RLS is enabled, add a DELETE policy to \`${BOOKINGS_TABLE}\` for authenticated users limited to their own rows.`
          : "";
      setError(`${delError.message || "Failed to cancel booking."}${hint}`);
      setSaving(false);
      return;
    }

    if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
      setError(
        "No booking was deleted. This usually means your `bookings` table is missing an `id` column (recommended), or Row Level Security is blocking DELETE."
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);
    setDraft(null);
    navigate("/my-bookings", { replace: true });
    // Refresh list
    const key = getBookingKey(selectedBooking);
    setBookings((prev) => prev.filter((b) => getBookingKey(b) !== key));
  }, [navigate, selectedBooking, user.id]);

  const onSaveEdit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!draft) return;
      setError("");

      if (!supabase) {
        setError(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        );
        return;
      }

      if (!draft.booking_date) {
        setError("Please select a date.");
        return;
      }

      const s = parseTimeToMinutes(draft.start_time);
      const eMin = parseTimeToMinutes(draft.end_time);
      const min = parseTimeToMinutes(DAYTIME_START);
      const max = parseTimeToMinutes(DAYTIME_END);
      if (s < min || s >= max) {
        setError("Start time must be between 8:00 AM and 5:00 PM.");
        return;
      }
      if (eMin <= min || eMin > max) {
        setError("End time must be between 8:00 AM and 5:00 PM.");
        return;
      }
      if (eMin <= s) {
        setError("End time must be after start time.");
        return;
      }
      if (rangeOverlapsAny(s, eMin, bookedIntervals)) {
        setError("That time range is already booked. Please select a different time window.");
        return;
      }

      setSaving(true);
      // Re-check overlaps against live rows before update.
      const { data: existing, error: existingError } = await supabase
        .from(BOOKINGS_TABLE)
        .select("id,start_time,end_time")
        .eq("room_id", draft.room_id)
        .eq("booking_date", draft.booking_date)
        .neq("id", draft.id);

      if (existingError) {
        setError(existingError.message || "Failed to validate availability.");
        setSaving(false);
        return;
      }

      if (rangeOverlapsAny(s, eMin, bookingsToIntervals(existing))) {
        setError("That time range was just booked. Please pick another time window.");
        setSaving(false);
        return;
      }

      const updatePayload = {
        booking_date: draft.booking_date,
        start_time: draft.start_time,
        end_time: draft.end_time,
        user_full_name: draft.user_full_name?.trim() || null,
        user_phone: draft.user_phone?.trim() || null,
      };

      const roomRate = Number(roomsById?.[draft.room_id]?.price_per_hour);
      if (Number.isFinite(roomRate) && roomRate > 0) {
        const minutes = Math.max(0, eMin - s);
        const hours = Math.round((minutes / 60) * 100) / 100;
        const total = Math.round(roomRate * hours * 100) / 100;
        updatePayload.price_per_hour = roomRate;
        updatePayload.billable_hours = hours || null;
        updatePayload.total_price = total || null;
      }

      const hasId = draft.id !== undefined && draft.id !== null;
      const updateQuery = supabase.from(BOOKINGS_TABLE).update(updatePayload).select("*");
      const { data: updatedRows, error: updateError } = hasId
        ? await updateQuery.eq("id", draft.id).eq("user_id", user.id)
        : await updateQuery.match({
            user_id: user.id,
            room_id: draft.original?.room_id,
            booking_date: draft.original?.booking_date,
            start_time: draft.original?.start_time,
            end_time: draft.original?.end_time,
            ...(draft.original?.created_at ? { created_at: draft.original.created_at } : {}),
          });

      if (updateError) {
        const hint =
          updateError?.message?.toLowerCase?.().includes("row level security") ||
          updateError?.message?.toLowerCase?.().includes("rls")
            ? `\n\nIf RLS is enabled, add an UPDATE policy to \`${BOOKINGS_TABLE}\` for authenticated users limited to their own rows.`
            : "";
        setError(`${updateError.message || "Failed to update booking."}${hint}`);
        setSaving(false);
        return;
      }

      const updatedRow = Array.isArray(updatedRows) ? updatedRows[0] : null;
      if (!updatedRow) {
        setError(
          "No booking was updated. This usually means your `bookings` table is missing an `id` column (recommended), or Row Level Security is blocking UPDATE."
        );
        setSaving(false);
        return;
      }

      setSaving(false);
      setEditing(false);
      setDraft(null);
      // Refresh list (lightweight local update)
      const oldKey = draft.key;
      const newKey = getBookingKey(updatedRow);
      setSearchParams({ bookingId: newKey }, { replace: true });
      setBookings((prev) =>
        prev.map((b) =>
          getBookingKey(b) === oldKey
            ? {
                ...b,
                ...updatedRow,
              }
            : b
        )
      );
    },
    [bookedIntervals, draft, roomsById, setSearchParams, user.id]
  );

  if (loading) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Loading your bookings…</p>
        <p className="mt-1 text-sm text-muted">Fetching reservations from Supabase.</p>
      </Card>
    );
  }

  if (error && !bookings.length) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Unable to load bookings</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-red-600">{error}</p>
        <div className="mt-4 flex gap-3">
          <Link to="/">
            <Button variant="outline">Back to home</Button>
          </Link>
          <Link to="/profile">
            <Button>Profile</Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (!bookings.length) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">No bookings yet</p>
        <p className="mt-1 text-sm text-muted">
          When you book a room, it will show up here with options to edit or cancel.
        </p>
        <div className="mt-4">
          <Link to="/">
            <Button>Browse rooms</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          My bookings
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Your reservations</h1>
        <p className="mt-2 text-sm text-muted">
          Select a booking to view details, edit, or cancel.
        </p>

        <div className="mt-5 space-y-2">
          {bookings.map((b) => {
            const key = getBookingKey(b);
            const active = key === getBookingKey(selectedBooking);
            const room = roomsById[b.room_id];
            const title = room?.title || `Room ${b.room_id || "—"}`;
            const total = b.total_price ?? null;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSearchParams({ bookingId: key })}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-brand-300 bg-brand-50"
                    : "border-border bg-white hover:border-brand-200"
                }`}
              >
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="mt-1 text-xs text-muted">
                  {b.booking_date || "—"} · {b.start_time || "—"}–{b.end_time || "—"}
                </p>
                {total !== null && total !== undefined && total !== "" ? (
                  <p className="mt-1 text-xs text-muted">Total: {formatMoney(total)}</p>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex gap-3">
          <Link to="/profile">
            <Button variant="outline">Profile</Button>
          </Link>
          <Link to="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>
      </Card>

      <Card className="lg:col-span-3">
        <p className="text-sm font-semibold text-ink">Booking details</p>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        ) : null}

        {!selectedBooking ? null : editing && draft ? (
          <form className="mt-4 space-y-4" onSubmit={onSaveEdit} noValidate>
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-sm font-semibold text-ink">Edit booking</p>
              <p className="mt-1 text-sm text-muted">
                Unavailable time slots are disabled to prevent overlaps.
              </p>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted">Date</span>
              <DatePicker
                className={INPUT_STYLES}
                placeholder="Select date"
                value={draft.booking_date ? dayjs(draft.booking_date) : null}
                onChange={(_, dateString) =>
                  setDraft((d) => (d ? { ...d, booking_date: dateString || "" } : d))
                }
                disabledDate={(current) => current && current < dayjs().startOf("day")}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted">Start time</span>
                <select
                  value={draft.start_time}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, start_time: e.target.value } : d))
                  }
                  className={INPUT_STYLES}
                  disabled={!draft.booking_date || bookingsLoading}
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
                  value={draft.end_time}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, end_time: e.target.value } : d))
                  }
                  className={INPUT_STYLES}
                  disabled={!draft.booking_date || bookingsLoading}
                >
                  {endOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <FormInput
              label="Full name (optional)"
              value={draft.user_full_name}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, user_full_name: e.target.value } : d))
              }
              placeholder="Ada Lovelace"
              autoComplete="name"
            />
            <FormInput
              label="Phone (optional)"
              value={draft.user_phone}
              onChange={(e) => setDraft((d) => (d ? { ...d, user_phone: e.target.value } : d))}
              placeholder="+1 (555) 123-4567"
              autoComplete="tel"
            />

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                {selectedRoom?.location || "Booking"}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-ink">
                {selectedRoom?.title || `Room ${selectedBooking.room_id || "—"}`}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {selectedBooking.booking_date || "—"} · {selectedBooking.start_time || "—"}–
                {selectedBooking.end_time || "—"}
              </p>
              {selectedBooking.total_price !== undefined &&
              selectedBooking.total_price !== null &&
              selectedBooking.total_price !== "" ? (
                <p className="mt-2 text-sm text-ink">
                  Total:{" "}
                  <span className="font-semibold">{formatMoney(selectedBooking.total_price)}</span>
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted">
                Created: {safeDateText(selectedBooking.created_at)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Guest
                </p>
                <p className="mt-2 text-sm text-ink">
                  {selectedBooking.user_full_name || "—"}
                </p>
                <p className="mt-1 text-sm text-muted">{selectedBooking.user_email || "—"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Contact
                </p>
                <p className="mt-2 text-sm text-ink">{selectedBooking.user_phone || "—"}</p>
                <p className="mt-1 text-sm text-muted">Room ID: {selectedBooking.room_id || "—"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={beginEdit}>
                Edit booking
              </Button>
              <Button type="button" variant="outline" onClick={onCancelBooking} disabled={saving}>
                {saving ? "Cancelling…" : "Cancel booking"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
});

export default MyBookings;

