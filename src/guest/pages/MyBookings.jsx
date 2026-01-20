import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DatePicker, Modal } from "antd";
import dayjs from "dayjs";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { DAYTIME_END, DAYTIME_START } from "../utils/constants.js";
import { useAuth } from "../../auth/useAuth.js";
import { supabase } from "../../lib/supabaseClient.js";

const BOOKINGS_TABLE = "bookings";
const TIME_STEP_MINUTES = 30;

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

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timeStr) {
  if (!timeStr) return "N/A";
  return minutesToLabel(parseTimeToMinutes(timeStr));
}

function isTimeSlotOverlapping(existingBookings, startMinutes, endMinutes, excludeBookingId = null) {
  for (const booking of existingBookings) {
    if (excludeBookingId && booking.id === excludeBookingId) continue;
    const bookingStart = parseTimeToMinutes(booking.start_time);
    const bookingEnd = parseTimeToMinutes(booking.end_time);
    // Check for overlap: two ranges overlap if start1 < end2 AND start2 < end1
    if (startMinutes < bookingEnd && bookingStart < endMinutes) {
      return true;
    }
  }
  return false;
}

function getDisabledTimeSlots(existingBookings, excludeBookingId = null) {
  const disabled = new Set();
  for (const booking of existingBookings) {
    if (excludeBookingId && booking.id === excludeBookingId) continue;
    const bookingStart = parseTimeToMinutes(booking.start_time);
    const bookingEnd = parseTimeToMinutes(booking.end_time);
    // Mark all slots within this booking as disabled
    for (let m = bookingStart; m < bookingEnd; m += TIME_STEP_MINUTES) {
      disabled.add(m);
    }
  }
  return disabled;
}

const BookingCard = React.memo(({ booking, room, onEdit, onCancel, isHighlighted }) => {
  const isPast = new Date(booking.booking_date) < new Date(new Date().toDateString());
  const statusColor = isPast ? "text-muted" : "text-green-700";
  const statusBg = isPast ? "bg-slate-100" : "bg-green-50";
  const statusText = isPast ? "Completed" : "Upcoming";

  return (
    <Card className={`transition-all ${isHighlighted ? "ring-2 ring-brand-500 ring-offset-2" : ""}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          {room?.image && (
            <img
              src={room.image}
              alt={room?.title || "Room"}
              className="h-24 w-24 flex-shrink-0 rounded-xl object-cover"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-ink">
                {room?.title || "Room"}
              </h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBg} ${statusColor}`}>
                {statusText}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{room?.location || "Location unavailable"}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <div>
                <span className="text-muted">Date: </span>
                <span className="font-medium text-ink">{formatDate(booking.booking_date)}</span>
              </div>
              <div>
                <span className="text-muted">Time: </span>
                <span className="font-medium text-ink">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </span>
              </div>
            </div>
            {(booking.user_full_name || booking.user_phone) && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {booking.user_full_name && <span>Name: {booking.user_full_name}</span>}
                {booking.user_phone && <span>Phone: {booking.user_phone}</span>}
              </div>
            )}
          </div>
        </div>
        {!isPast && (
          <div className="flex gap-2 sm:flex-col">
            <Button variant="outline" onClick={() => onEdit(booking)}>
              Edit
            </Button>
            <Button
              variant="outline"
              className="!border-red-200 !text-red-600 hover:!border-red-400 hover:!bg-red-50"
              onClick={() => onCancel(booking)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
});

const EditBookingModal = React.memo(({
  open,
  booking,
  room,
  existingBookings,
  onClose,
  onSave,
}) => {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState(DAYTIME_START);
  const [endTime, setEndTime] = useState(DAYTIME_END);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dateBookings, setDateBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    if (booking && open) {
      setDate(booking.booking_date || "");
      setStartTime(booking.start_time || DAYTIME_START);
      setEndTime(booking.end_time || DAYTIME_END);
      setFullName(booking.user_full_name || "");
      setPhone(booking.user_phone || "");
      setError("");
    }
  }, [booking, open]);

  // Fetch bookings for the selected date
  useEffect(() => {
    if (!date || !room?.id || !open) {
      setDateBookings([]);
      return;
    }

    let cancelled = false;

    async function fetchDateBookings() {
      setLoadingBookings(true);
      const { data, error: fetchError } = await supabase
        .from(BOOKINGS_TABLE)
        .select("*")
        .eq("room_id", room.id)
        .eq("booking_date", date);

      if (cancelled) return;

      if (fetchError) {
        console.error("Error fetching bookings:", fetchError);
        setDateBookings([]);
      } else {
        setDateBookings(data || []);
      }
      setLoadingBookings(false);
    }

    fetchDateBookings();
    return () => { cancelled = true; };
  }, [date, room?.id, open]);

  const allTimes = useMemo(
    () => buildTimeOptions({ start: DAYTIME_START, end: DAYTIME_END, stepMinutes: TIME_STEP_MINUTES }),
    []
  );

  const daytimeStartMinutes = useMemo(() => parseTimeToMinutes(DAYTIME_START), []);
  const daytimeEndMinutes = useMemo(() => parseTimeToMinutes(DAYTIME_END), []);
  const startMinutes = useMemo(() => parseTimeToMinutes(startTime), [startTime]);
  const endMinutes = useMemo(() => parseTimeToMinutes(endTime), [endTime]);

  const disabledSlots = useMemo(
    () => getDisabledTimeSlots(dateBookings, booking?.id),
    [dateBookings, booking?.id]
  );

  const startOptions = useMemo(() => {
    const lastStart = daytimeEndMinutes - TIME_STEP_MINUTES;
    return allTimes
      .filter((t) => t.minutes >= daytimeStartMinutes && t.minutes <= lastStart)
      .map((t) => ({
        ...t,
        disabled: disabledSlots.has(t.minutes),
      }));
  }, [allTimes, daytimeEndMinutes, daytimeStartMinutes, disabledSlots]);

  const endOptions = useMemo(() => {
    const minEnd = startMinutes + TIME_STEP_MINUTES;
    return allTimes
      .filter((t) => t.minutes >= minEnd && t.minutes <= daytimeEndMinutes)
      .map((t) => {
        // End time is disabled if any slot between start and this end is booked
        let isDisabled = false;
        for (let m = startMinutes; m < t.minutes; m += TIME_STEP_MINUTES) {
          if (disabledSlots.has(m)) {
            isDisabled = true;
            break;
          }
        }
        return { ...t, disabled: isDisabled };
      });
  }, [allTimes, daytimeEndMinutes, startMinutes, disabledSlots]);

  useEffect(() => {
    const minEnd = startMinutes + TIME_STEP_MINUTES;
    if (endMinutes < minEnd) {
      const next = minutesToTimeValue(Math.min(minEnd, daytimeEndMinutes));
      setEndTime(next);
    }
  }, [daytimeEndMinutes, endMinutes, startMinutes]);

  const handleSave = useCallback(async () => {
    setError("");

    if (!date) {
      setError("Please select a date.");
      return;
    }

    const s = parseTimeToMinutes(startTime);
    const e = parseTimeToMinutes(endTime);

    if (e <= s) {
      setError("End time must be after start time.");
      return;
    }

    // Check for overlapping bookings
    if (isTimeSlotOverlapping(dateBookings, s, e, booking?.id)) {
      setError("This time slot overlaps with an existing booking. Please choose a different time.");
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase
      .from(BOOKINGS_TABLE)
      .update({
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        user_full_name: fullName.trim() || null,
        user_phone: phone.trim() || null,
      })
      .eq("id", booking.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message || "Failed to update booking.");
      return;
    }

    onSave();
  }, [booking?.id, date, dateBookings, endTime, fullName, onSave, phone, startTime]);

  return (
    <Modal
      title="Edit Booking"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <div className="space-y-4 pt-4">
        {room && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-slate-50 p-3">
            {room.image && (
              <img src={room.image} alt={room.title} className="h-12 w-12 rounded-lg object-cover" />
            )}
            <div>
              <p className="font-medium text-ink">{room.title}</p>
              <p className="text-xs text-muted">{room.location}</p>
            </div>
          </div>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted">Date</span>
          <DatePicker
            className={INPUT_STYLES}
            placeholder="Select date"
            value={date ? dayjs(date) : null}
            onChange={(_, dateString) => {
              setDate(dateString || "");
              setError("");
            }}
            disabledDate={(current) => current && current < dayjs().startOf("day")}
          />
        </label>

        {loadingBookings && (
          <p className="text-xs text-muted">Loading available time slots...</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Start time</span>
            <select
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                setError("");
              }}
              className={INPUT_STYLES}
            >
              {startOptions.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}{opt.disabled ? " (Booked)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">End time</span>
            <select
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                setError("");
              }}
              className={INPUT_STYLES}
            >
              {endOptions.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}{opt.disabled ? " (Unavailable)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
          <FormInput
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

const CancelBookingModal = React.memo(({ open, booking, room, onClose, onConfirm }) => {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = useCallback(async () => {
    setError("");
    setCancelling(true);

    const { error: deleteError } = await supabase
      .from(BOOKINGS_TABLE)
      .delete()
      .eq("id", booking.id);

    setCancelling(false);

    if (deleteError) {
      setError(deleteError.message || "Failed to cancel booking.");
      return;
    }

    onConfirm();
  }, [booking?.id, onConfirm]);

  return (
    <Modal
      title="Cancel Booking"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted">
          Are you sure you want to cancel this booking? This action cannot be undone.
        </p>

        {room && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="font-medium text-ink">{room.title}</p>
            <p className="text-sm text-muted">{room.location}</p>
            <div className="mt-2 text-sm">
              <span className="text-muted">Date: </span>
              <span className="font-medium text-ink">{formatDate(booking?.booking_date)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted">Time: </span>
              <span className="font-medium text-ink">
                {formatTime(booking?.start_time)} - {formatTime(booking?.end_time)}
              </span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Keep Booking
          </Button>
          <Button
            className="!bg-red-600 hover:!bg-red-700"
            onClick={handleConfirm}
            disabled={cancelling}
          >
            {cancelling ? "Cancelling..." : "Yes, Cancel Booking"}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

const MyBookings = React.memo(() => {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightedBookingId = searchParams.get("highlight");

  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingBooking, setEditingBooking] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);

  const fetchBookings = useCallback(async () => {
    if (!user?.id || !supabase) return;

    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from(BOOKINGS_TABLE)
      .select("*")
      .eq("user_id", user.id)
      .order("booking_date", { ascending: false });

    if (fetchError) {
      setError(fetchError.message || "Failed to load bookings.");
      setLoading(false);
      return;
    }

    setBookings(data || []);

    // Fetch room details for each booking
    const roomIds = [...new Set((data || []).map((b) => b.room_id).filter(Boolean))];
    if (roomIds.length > 0) {
      const { data: roomsData } = await supabase
        .from("rooms")
        .select("*")
        .in("id", roomIds);

      const roomsMap = {};
      (roomsData || []).forEach((r) => {
        roomsMap[r.id] = r;
      });
      setRooms(roomsMap);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleEdit = useCallback((booking) => {
    setEditingBooking(booking);
  }, []);

  const handleCancel = useCallback((booking) => {
    setCancellingBooking(booking);
  }, []);

  const handleEditSave = useCallback(() => {
    setEditingBooking(null);
    fetchBookings();
  }, [fetchBookings]);

  const handleCancelConfirm = useCallback(() => {
    setCancellingBooking(null);
    fetchBookings();
  }, [fetchBookings]);

  if (authLoading || loading) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Loading bookings...</p>
        <p className="mt-1 text-sm text-muted">Please wait while we fetch your reservations.</p>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Not signed in</p>
        <p className="mt-1 text-sm text-muted">Please sign in to view your bookings.</p>
        <div className="mt-4">
          <Link to="/auth">
            <Button>Sign in</Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Error loading bookings</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
        <div className="mt-4">
          <Button onClick={fetchBookings}>Try Again</Button>
        </div>
      </Card>
    );
  }

  const upcomingBookings = bookings.filter(
    (b) => new Date(b.booking_date) >= new Date(new Date().toDateString())
  );
  const pastBookings = bookings.filter(
    (b) => new Date(b.booking_date) < new Date(new Date().toDateString())
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            My Bookings
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Your Reservations</h1>
          <p className="mt-1 text-sm text-muted">
            Manage your daytime room bookings
          </p>
        </div>
        <Link to="/">
          <Button variant="outline">Browse Rooms</Button>
        </Link>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-ink">No bookings yet</p>
            <p className="mt-1 text-sm text-muted">
              Start by browsing available rooms and making your first reservation.
            </p>
            <div className="mt-4">
              <Link to="/">
                <Button>Browse Rooms</Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {upcomingBookings.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-ink">
                Upcoming ({upcomingBookings.length})
              </h2>
              {upcomingBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  room={rooms[booking.room_id]}
                  onEdit={handleEdit}
                  onCancel={handleCancel}
                  isHighlighted={booking.id === highlightedBookingId}
                />
              ))}
            </div>
          )}

          {pastBookings.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-ink">
                Past ({pastBookings.length})
              </h2>
              {pastBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  room={rooms[booking.room_id]}
                  onEdit={handleEdit}
                  onCancel={handleCancel}
                  isHighlighted={booking.id === highlightedBookingId}
                />
              ))}
            </div>
          )}
        </>
      )}

      <EditBookingModal
        open={!!editingBooking}
        booking={editingBooking}
        room={editingBooking ? rooms[editingBooking.room_id] : null}
        existingBookings={bookings}
        onClose={() => setEditingBooking(null)}
        onSave={handleEditSave}
      />

      <CancelBookingModal
        open={!!cancellingBooking}
        booking={cancellingBooking}
        room={cancellingBooking ? rooms[cancellingBooking.room_id] : null}
        onClose={() => setCancellingBooking(null)}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
});

export default MyBookings;
