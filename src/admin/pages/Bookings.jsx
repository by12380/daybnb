import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, DatePicker } from "antd";
import dayjs from "dayjs";
import { supabase } from "../../lib/supabaseClient.js";
import { formatPrice } from "../../guest/utils/format.js";
import Button from "../../guest/components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import { DAYTIME_START, DAYTIME_END } from "../../guest/utils/constants.js";

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
  // Parse date parts directly to avoid timezone conversion
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString("en-US", {
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

const ViewBookingModal = React.memo(({ open, booking, room, userProfile, onClose }) => {
  if (!booking) return null;

  // Use local date for comparison (YYYY-MM-DD format)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isPast = booking.booking_date < today;
  const statusColor = isPast ? "bg-slate-100 text-slate-600" : "bg-green-50 text-green-700";
  const statusText = isPast ? "Completed" : "Upcoming";

  return (
    <Modal
      title="Booking Details"
      open={open}
      onCancel={onClose}
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
      destroyOnClose
    >
      <div className="space-y-4 pt-4">
        {/* Room Info */}
        {room && (
          <div className="flex items-center gap-4 rounded-xl border border-border bg-slate-50 p-4">
            {room.image && (
              <img src={room.image} alt={room.title} className="h-16 w-16 rounded-lg object-cover" />
            )}
            <div>
              <p className="font-semibold text-ink">{room.title}</p>
              <p className="text-sm text-muted">{room.location}</p>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted">Status:</span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}>
            {statusText}
          </span>
        </div>

        {/* Booking Details */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted">Date</p>
            <p className="mt-1 text-sm font-medium text-ink">{formatDate(booking.booking_date)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Time</p>
            <p className="mt-1 text-sm font-medium text-ink">
              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Guest Name</p>
            <p className="mt-1 text-sm font-medium text-ink">
              {booking.user_full_name || userProfile?.full_name || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Phone</p>
            <p className="mt-1 text-sm font-medium text-ink">
              {booking.user_phone || userProfile?.phone || "N/A"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium text-muted">Email</p>
            <p className="mt-1 text-sm font-medium text-ink">
              {userProfile?.email || booking.user_email || "N/A"}
            </p>
          </div>
        </div>

        {/* Price */}
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink">Total Amount</span>
            <span className="text-xl font-bold text-brand-700">
              {formatPrice(booking.total_price || 0)}
            </span>
          </div>
          {booking.price_per_hour && (
            <p className="mt-1 text-xs text-muted">
              {formatPrice(booking.price_per_hour)}/hr × {booking.billable_hours || 0} hrs
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted">
            Booking ID: <span className="font-mono">{booking.id}</span>
          </p>
          <p className="text-xs text-muted">
            User ID: <span className="font-mono">{booking.user_id}</span>
          </p>
          {booking.created_at && (
            <p className="text-xs text-muted">
              Created: {new Date(booking.created_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
});

const EditBookingModal = React.memo(({ open, booking, room, onClose, onSave }) => {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState(DAYTIME_START);
  const [endTime, setEndTime] = useState(DAYTIME_END);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  const allTimes = useMemo(
    () => buildTimeOptions({ start: DAYTIME_START, end: DAYTIME_END, stepMinutes: TIME_STEP_MINUTES }),
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
    const minEnd = startMinutes + TIME_STEP_MINUTES;
    if (endMinutes < minEnd) {
      const next = minutesToTimeValue(Math.min(minEnd, daytimeEndMinutes));
      setEndTime(next);
    }
  }, [daytimeEndMinutes, endMinutes, startMinutes]);

  const durationHours = useMemo(() => {
    const minutes = Math.max(0, endMinutes - startMinutes);
    return minutes / 60;
  }, [endMinutes, startMinutes]);

  const pricePerHour = room?.price_per_hour ?? 0;
  const totalPrice = durationHours * pricePerHour;

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

    setSaving(true);

    const { error: updateError } = await supabase
      .from(BOOKINGS_TABLE)
      .update({
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        user_full_name: fullName.trim() || null,
        user_phone: phone.trim() || null,
        total_price: totalPrice > 0 ? totalPrice : null,
        price_per_hour: pricePerHour > 0 ? pricePerHour : null,
        billable_hours: durationHours > 0 ? durationHours : null,
      })
      .eq("id", booking.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message || "Failed to update booking.");
      return;
    }

    onSave();
  }, [booking?.id, date, durationHours, endTime, fullName, onSave, phone, pricePerHour, startTime, totalPrice]);

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
          />
        </label>

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
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput
            label="Guest Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Guest name"
          />
          <FormInput
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {durationHours > 0 && pricePerHour > 0 && (
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">
                {durationHours} hr{durationHours !== 1 ? "s" : ""} × {formatPrice(pricePerHour)}/hr
              </span>
              <span className="text-lg font-bold text-brand-700">{formatPrice(totalPrice)}</span>
            </div>
          </div>
        )}

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

const DeleteBookingModal = React.memo(({ open, booking, room, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = useCallback(async () => {
    setError("");
    setDeleting(true);

    const { error: deleteError } = await supabase
      .from(BOOKINGS_TABLE)
      .delete()
      .eq("id", booking.id);

    setDeleting(false);

    if (deleteError) {
      setError(deleteError.message || "Failed to delete booking.");
      return;
    }

    onConfirm();
  }, [booking?.id, onConfirm]);

  return (
    <Modal
      title="Delete Booking"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted">
          Are you sure you want to delete this booking? This action cannot be undone.
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
              <span className="text-muted">Guest: </span>
              <span className="font-medium text-ink">{booking?.user_full_name || "N/A"}</span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="!bg-red-600 hover:!bg-red-700"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Booking"}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState({});
  const [profilesById, setProfilesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [viewingBooking, setViewingBooking] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [deletingBooking, setDeletingBooking] = useState(null);

  const fetchBookings = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);

    // Fetch all bookings
    const { data: bookingsData, error: bookingsError } = await supabase
      .from(BOOKINGS_TABLE)
      .select("*")
      .order("booking_date", { ascending: false });

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      setLoading(false);
      return;
    }

    // Fetch all rooms
    const { data: roomsData, error: roomsError } = await supabase
      .from("rooms")
      .select("*");

    if (roomsError) {
      console.error("Error fetching rooms:", roomsError);
    }

    // Fetch all profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    // Create lookup maps
    const roomsMap = {};
    (roomsData || []).forEach((room) => {
      roomsMap[room.id] = room;
    });

    const profilesMap = {};
    (profilesData || []).forEach((profile) => {
      profilesMap[profile.id] = profile;
    });

    // Enrich bookings with room and user data
    const enrichedBookings = (bookingsData || []).map((booking) => ({
      ...booking,
      room: roomsMap[booking.room_id] || null,
      user: profilesMap[booking.user_id] || null,
    }));

    setBookings(enrichedBookings);
    setRooms(roomsMap);
    setProfilesById(profilesMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = useMemo(() => {
    // Use local date for comparison (YYYY-MM-DD format)
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    return bookings.filter((booking) => {
      // Status filter
      if (statusFilter === "upcoming" && booking.booking_date < today) return false;
      if (statusFilter === "completed" && booking.booking_date >= today) return false;
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const room = booking.room || rooms[booking.room_id];
        const profile = booking.user || profilesById[booking.user_id];
        const matchesRoom = room?.title?.toLowerCase().includes(search);
        const matchesGuest =
          booking.user_full_name?.toLowerCase().includes(search) ||
          profile?.full_name?.toLowerCase().includes(search);
        const matchesPhone = booking.user_phone?.includes(search);
        const matchesEmail =
          booking.user_email?.toLowerCase?.().includes(search) ||
          profile?.email?.toLowerCase?.().includes(search);
        if (!matchesRoom && !matchesGuest && !matchesPhone && !matchesEmail) return false;
      }

      return true;
    });
  }, [bookings, profilesById, rooms, searchTerm, statusFilter]);

  const handleEditSave = useCallback(() => {
    setEditingBooking(null);
    fetchBookings();
  }, [fetchBookings]);

  const handleDeleteConfirm = useCallback(() => {
    setDeletingBooking(null);
    fetchBookings();
  }, [fetchBookings]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bookings</h1>
          <p className="mt-1 text-sm text-muted">
            Manage all reservations ({bookings.length} total)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by room, guest name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${INPUT_STYLES} w-full`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={INPUT_STYLES}
        >
          <option value="all">All Bookings</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Bookings Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {filteredBookings.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-4 text-sm font-medium text-ink">No bookings found</p>
            <p className="mt-1 text-sm text-muted">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Bookings will appear here when guests make reservations"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-6 py-3">Room</th>
                  <th className="px-6 py-3">Guest</th>
                  <th className="px-6 py-3">Date & Time</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const room = booking.room || rooms[booking.room_id];
                  const profile = booking.user || profilesById[booking.user_id];
                  // Use local date for comparison (YYYY-MM-DD format)
                  const now = new Date();
                  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                  const isPast = booking.booking_date < todayStr;
                  const statusColor = isPast ? "bg-slate-100 text-slate-600" : "bg-green-50 text-green-700";
                  const statusText = isPast ? "Completed" : "Upcoming";

                  console.log(booking.booking_date);

                  return (
                    <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {room?.image && (
                            <img
                              src={room.image}
                              alt={room?.title || "Room"}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium text-ink">{room?.title || "Unknown"}</p>
                            <p className="text-xs text-muted">{room?.location || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-ink">
                          {booking.user_full_name || profile?.full_name || "Guest"}
                        </p>
                        <p className="text-xs text-muted">
                          {profile?.email || booking.user_email || booking.user_phone || "N/A"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-ink">{formatDate(booking.booking_date)}</p>
                        <p className="text-xs text-muted">
                          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-ink">{formatPrice(booking.total_price || 0)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setViewingBooking(booking)}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
                            title="View"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setEditingBooking(booking)}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeletingBooking(booking)}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <ViewBookingModal
        open={!!viewingBooking}
        booking={viewingBooking}
        room={viewingBooking ? (viewingBooking.room || rooms[viewingBooking.room_id]) : null}
        userProfile={viewingBooking ? (viewingBooking.user || profilesById[viewingBooking.user_id]) : null}
        onClose={() => setViewingBooking(null)}
      />

      <EditBookingModal
        open={!!editingBooking}
        booking={editingBooking}
        room={editingBooking ? (editingBooking.room || rooms[editingBooking.room_id]) : null}
        onClose={() => setEditingBooking(null)}
        onSave={handleEditSave}
      />

      <DeleteBookingModal
        open={!!deletingBooking}
        booking={deletingBooking}
        room={deletingBooking ? (deletingBooking.room || rooms[deletingBooking.room_id]) : null}
        onClose={() => setDeletingBooking(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
