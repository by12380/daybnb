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

function getBookingStatusInfo(booking) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isPast = booking.booking_date < today;

  // Check booking status field first
  if (booking.status === "pending") {
    return { color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", text: "Pending Approval" };
  }
  if (booking.status === "rejected") {
    return { color: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400", text: "Rejected" };
  }
  if (booking.status === "approved") {
    if (isPast) {
      return { color: "bg-surface/60 text-muted", text: "Completed" };
    }
    return { color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400", text: "Approved" };
  }
  // Default fallback for bookings without status field
  if (isPast) {
    return { color: "bg-surface/60 text-muted", text: "Completed" };
  }
  return { color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400", text: "Upcoming" };
}

const ViewBookingModal = React.memo(({ open, booking, room, userProfile, onClose }) => {
  if (!booking) return null;

  const statusInfo = getBookingStatusInfo(booking);

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
          <div className="flex items-center gap-4 rounded-xl border border-border bg-surface/60 p-4">
            {room.image && (
              <img src={room.image} alt={room.title} className="h-16 w-16 rounded-lg object-cover" />
            )}
            <div>
              <p className="font-semibold text-ink dark:text-dark-ink">{room.title}</p>
              <p className="text-sm text-muted dark:text-dark-muted">{room.location}</p>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted dark:text-dark-muted">Status:</span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>

        {/* Booking Details */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted dark:text-dark-muted">Date</p>
            <p className="mt-1 text-sm font-medium text-ink dark:text-dark-ink">{formatDate(booking.booking_date)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted dark:text-dark-muted">Time</p>
            <p className="mt-1 text-sm font-medium text-ink dark:text-dark-ink">
              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted dark:text-dark-muted">Guest Name</p>
            <p className="mt-1 text-sm font-medium text-ink dark:text-dark-ink">
              {booking.user_full_name || userProfile?.full_name || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted dark:text-dark-muted">Phone</p>
            <p className="mt-1 text-sm font-medium text-ink dark:text-dark-ink">
              {booking.user_phone || userProfile?.phone || "N/A"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium text-muted dark:text-dark-muted">Email</p>
            <p className="mt-1 text-sm font-medium text-ink dark:text-dark-ink">
              {userProfile?.email || booking.user_email || "N/A"}
            </p>
          </div>
        </div>

        {/* Price */}
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/30">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink dark:text-dark-ink">Total Amount</span>
            <span className="text-xl font-bold text-brand-700 dark:text-brand-400">
              {formatPrice(booking.total_price || 0)}
            </span>
          </div>
          {booking.price_per_hour && (
            <p className="mt-1 text-xs text-muted dark:text-dark-muted">
              {formatPrice(booking.price_per_hour)}/hr × {booking.billable_hours || 0} hrs
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="border-t border-border pt-4 dark:border-dark-border">
          <p className="text-xs text-muted dark:text-dark-muted">
            Booking ID: <span className="font-mono">{booking.id}</span>
          </p>
          <p className="text-xs text-muted dark:text-dark-muted">
            User ID: <span className="font-mono">{booking.user_id}</span>
          </p>
          {booking.created_at && (
            <p className="text-xs text-muted dark:text-dark-muted">
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
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3">
            {room.image && (
              <img src={room.image} alt={room.title} className="h-12 w-12 rounded-lg object-cover" />
            )}
            <div>
              <p className="font-medium text-ink dark:text-dark-ink">{room.title}</p>
              <p className="text-xs text-muted dark:text-dark-muted">{room.location}</p>
            </div>
          </div>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted dark:text-dark-muted">Date</span>
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
            <span className="text-sm font-medium text-muted dark:text-dark-muted">Start time</span>
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
            <span className="text-sm font-medium text-muted dark:text-dark-muted">End time</span>
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
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted dark:text-dark-muted">
                {durationHours} hr{durationHours !== 1 ? "s" : ""} × {formatPrice(pricePerHour)}/hr
              </span>
              <span className="text-lg font-bold text-brand-700 dark:text-brand-400">{formatPrice(totalPrice)}</span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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
        <p className="text-sm text-muted dark:text-dark-muted">
          Are you sure you want to delete this booking? This action cannot be undone.
        </p>

        {room && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
            <p className="font-medium text-ink dark:text-dark-ink">{room.title}</p>
            <p className="text-sm text-muted dark:text-dark-muted">{room.location}</p>
            <div className="mt-2 text-sm">
              <span className="text-muted dark:text-dark-muted">Date: </span>
              <span className="font-medium text-ink dark:text-dark-ink">{formatDate(booking?.booking_date)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted dark:text-dark-muted">Guest: </span>
              <span className="font-medium text-ink dark:text-dark-ink">{booking?.user_full_name || "N/A"}</span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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

const ApproveBookingModal = React.memo(({ open, booking, room, onClose, onConfirm }) => {
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");

  const handleApprove = useCallback(async () => {
    setError("");
    setApproving(true);

    // Update booking status to approved
    const { error: updateError } = await supabase
      .from(BOOKINGS_TABLE)
      .update({ status: "approved" })
      .eq("id", booking.id);

    if (updateError) {
      setError(updateError.message || "Failed to approve booking.");
      setApproving(false);
      return;
    }

    // Create notification for the user
    const { error: notifyError } = await supabase
      .from("notifications")
      .insert({
        recipient_user_id: booking.user_id,
        type: "booking_approved",
        title: "Booking Confirmed!",
        body: `Your booking for ${room?.title || "the room"} on ${formatDate(booking.booking_date)} has been approved.`,
        data: {
          booking_id: booking.id,
          room_id: booking.room_id,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
        },
      });

    if (notifyError) {
      console.error("Failed to send notification:", notifyError);
      // Don't fail the approval if notification fails
    }

    setApproving(false);
    onConfirm();
  }, [booking, room, onConfirm]);

  return (
    <Modal
      title="Approve Booking"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted dark:text-dark-muted">
          Are you sure you want to approve this booking? The guest will be notified.
        </p>

        {room && (
          <div className="rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/30">
            <p className="font-medium text-ink dark:text-dark-ink">{room.title}</p>
            <p className="text-sm text-muted dark:text-dark-muted">{room.location}</p>
            <div className="mt-2 text-sm">
              <span className="text-muted dark:text-dark-muted">Date: </span>
              <span className="font-medium text-ink dark:text-dark-ink">{formatDate(booking?.booking_date)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted dark:text-dark-muted">Time: </span>
              <span className="font-medium text-ink dark:text-dark-ink">
                {formatTime(booking?.start_time)} - {formatTime(booking?.end_time)}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted dark:text-dark-muted">Guest: </span>
              <span className="font-medium text-ink dark:text-dark-ink">{booking?.user_full_name || booking?.user_email || "N/A"}</span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="!bg-green-600 hover:!bg-green-700"
            onClick={handleApprove}
            disabled={approving}
          >
            {approving ? "Approving..." : "Approve Booking"}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

const RejectBookingModal = React.memo(({ open, booking, room, onClose, onConfirm }) => {
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");

  const handleReject = useCallback(async () => {
    setError("");
    setRejecting(true);

    // Update booking status to rejected
    const { error: updateError } = await supabase
      .from(BOOKINGS_TABLE)
      .update({ status: "rejected" })
      .eq("id", booking.id);

    if (updateError) {
      setError(updateError.message || "Failed to reject booking.");
      setRejecting(false);
      return;
    }

    // Create notification for the user
    const reasonText = reason.trim() ? ` Reason: ${reason.trim()}` : "";
    const { error: notifyError } = await supabase
      .from("notifications")
      .insert({
        recipient_user_id: booking.user_id,
        type: "booking_rejected",
        title: "Booking Not Approved",
        body: `Your booking request for ${room?.title || "the room"} on ${formatDate(booking.booking_date)} was not approved.${reasonText}`,
        data: {
          booking_id: booking.id,
          room_id: booking.room_id,
          booking_date: booking.booking_date,
          reason: reason.trim() || null,
        },
      });

    if (notifyError) {
      console.error("Failed to send notification:", notifyError);
      // Don't fail the rejection if notification fails
    }

    setRejecting(false);
    setReason("");
    onConfirm();
  }, [booking, room, reason, onConfirm]);

  return (
    <Modal
      title="Reject Booking"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted dark:text-dark-muted">
          Are you sure you want to reject this booking? The guest will be notified.
        </p>

        {room && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
            <p className="font-medium text-ink dark:text-dark-ink">{room.title}</p>
            <p className="text-sm text-muted dark:text-dark-muted">{room.location}</p>
            <div className="mt-2 text-sm">
              <span className="text-muted dark:text-dark-muted">Date: </span>
              <span className="font-medium text-ink dark:text-dark-ink">{formatDate(booking?.booking_date)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted dark:text-dark-muted">Time: </span>
              <span className="font-medium text-ink dark:text-dark-ink">
                {formatTime(booking?.start_time)} - {formatTime(booking?.end_time)}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted dark:text-dark-muted">Guest: </span>
              <span className="font-medium text-ink dark:text-dark-ink">{booking?.user_full_name || booking?.user_email || "N/A"}</span>
            </div>
          </div>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted dark:text-dark-muted">Reason (optional)</span>
          <textarea
            className={`${INPUT_STYLES} min-h-[80px] resize-none`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide a reason for rejection..."
          />
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="!bg-red-600 hover:!bg-red-700"
            onClick={handleReject}
            disabled={rejecting}
          >
            {rejecting ? "Rejecting..." : "Reject Booking"}
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
  const [approvingBooking, setApprovingBooking] = useState(null);
  const [rejectingBooking, setRejectingBooking] = useState(null);

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
      if (statusFilter === "pending" && booking.status !== "pending") return false;
      if (statusFilter === "approved" && booking.status !== "approved") return false;
      if (statusFilter === "rejected" && booking.status !== "rejected") return false;
      if (statusFilter === "upcoming") {
        // Upcoming = confirmed bookings with future dates
        if (booking.booking_date < today) return false;
        if (booking.status === "rejected") return false;
      }
      if (statusFilter === "completed") {
        // Completed = confirmed bookings with past dates
        if (booking.booking_date >= today) return false;
        if (booking.status === "rejected" || booking.status === "pending") return false;
      }
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

  // Count pending bookings for header display
  const pendingCount = useMemo(() => {
    return bookings.filter((b) => b.status === "pending").length;
  }, [bookings]);

  const handleEditSave = useCallback(() => {
    setEditingBooking(null);
    fetchBookings();
  }, [fetchBookings]);

  const handleDeleteConfirm = useCallback(() => {
    setDeletingBooking(null);
    fetchBookings();
  }, [fetchBookings]);

  const handleApproveConfirm = useCallback(() => {
    setApprovingBooking(null);
    fetchBookings();
  }, [fetchBookings]);

  const handleRejectConfirm = useCallback(() => {
    setRejectingBooking(null);
    fetchBookings();
  }, [fetchBookings]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600 dark:border-brand-700 dark:border-t-brand-400" />
          <p className="mt-4 text-sm text-muted dark:text-dark-muted">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink dark:text-dark-ink">Bookings</h1>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">
            Manage all reservations ({bookings.length} total)
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400">
                {pendingCount} pending approval
              </span>
            )}
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
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Bookings Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-sm transition-colors duration-300">
        {filteredBookings.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-muted dark:text-dark-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-4 text-sm font-medium text-ink dark:text-dark-ink">No bookings found</p>
            <p className="mt-1 text-sm text-muted dark:text-dark-muted">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Bookings will appear here when guests make reservations"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wider text-muted">
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
                  const statusInfo = getBookingStatusInfo(booking);
                  const isPending = booking.status === "pending";

                  return (
                    <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-surface/60">
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
                            <p className="font-medium text-ink dark:text-dark-ink">{room?.title || "Unknown"}</p>
                            <p className="text-xs text-muted dark:text-dark-muted">{room?.location || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-ink dark:text-dark-ink">
                          {booking.user_full_name || profile?.full_name || "Guest"}
                        </p>
                        <p className="text-xs text-muted dark:text-dark-muted">
                          {profile?.email || booking.user_email || booking.user_phone || "N/A"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-ink dark:text-dark-ink">{formatDate(booking.booking_date)}</p>
                        <p className="text-xs text-muted dark:text-dark-muted">
                          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-ink dark:text-dark-ink">{formatPrice(booking.total_price || 0)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => setApprovingBooking(booking)}
                                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-green-50 hover:text-green-600 dark:text-dark-muted dark:hover:bg-green-900/30 dark:hover:text-green-400"
                                title="Approve"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setRejectingBooking(booking)}
                                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:text-dark-muted dark:hover:bg-red-900/30 dark:hover:text-red-400"
                                title="Reject"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setViewingBooking(booking)}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface/60 hover:text-ink"
                            title="View"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setEditingBooking(booking)}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-dark-muted dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeletingBooking(booking)}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:text-dark-muted dark:hover:bg-red-900/30 dark:hover:text-red-400"
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

      <ApproveBookingModal
        open={!!approvingBooking}
        booking={approvingBooking}
        room={approvingBooking ? (approvingBooking.room || rooms[approvingBooking.room_id]) : null}
        onClose={() => setApprovingBooking(null)}
        onConfirm={handleApproveConfirm}
      />

      <RejectBookingModal
        open={!!rejectingBooking}
        booking={rejectingBooking}
        room={rejectingBooking ? (rejectingBooking.room || rooms[rejectingBooking.room_id]) : null}
        onClose={() => setRejectingBooking(null)}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
}
