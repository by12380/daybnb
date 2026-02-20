import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { DatePicker, Modal } from "antd";
import dayjs from "dayjs";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { formatPrice } from "../utils/format.js";
import { useAuth } from "../../auth/useAuth.js";
import {
  fetchBookings,
  updateBooking,
  deleteBooking,
  fetchAvailability,
  clearBookingError,
  clearBookedDates,
} from "../../redux/slices/bookingSlice.js";
import { fetchRooms } from "../../redux/slices/roomSlice.js";

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getBookingStatusInfo(booking) {
  const isPast = new Date(booking.booking_date) < new Date(new Date().toDateString());

  if (booking.status === "pending") {
    return { color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/30", border: "border-yellow-200 dark:border-yellow-700", text: "Pending Approval", canModify: true };
  }
  if (booking.status === "rejected") {
    return { color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30", border: "border-red-200 dark:border-red-700", text: "Rejected", canModify: false };
  }
  if (booking.status === "approved") {
    if (isPast) {
      return { color: "text-muted", bg: "bg-surface/60", border: "border-border", text: "Completed", canModify: false };
    }
    return { color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/30", border: "border-green-200 dark:border-green-700", text: "Approved", canModify: true };
  }
  if (isPast) {
    return { color: "text-muted", bg: "bg-surface/60", border: "border-border", text: "Completed", canModify: false };
  }
  return { color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/30", border: "border-green-200 dark:border-green-700", text: "Upcoming", canModify: true };
}

const BookingCard = React.memo(({ booking, room, onEdit, onCancel, isHighlighted }) => {
  const statusInfo = getBookingStatusInfo(booking);
  const isPast = new Date(booking.booking_date) < new Date(new Date().toDateString());

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
              <h3 className="text-lg font-semibold text-ink dark:text-dark-ink">
                {room?.title || "Room"}
              </h3>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
                {statusInfo.text}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted dark:text-dark-muted">{room?.location || "Location unavailable"}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <div>
                <span className="text-muted dark:text-dark-muted">Date: </span>
                <span className="font-medium text-ink dark:text-dark-ink">{formatDate(booking.booking_date)}</span>
              </div>
            </div>
            {booking.total_price != null && booking.total_price > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-lg font-semibold text-brand-700 dark:text-brand-400">{formatPrice(booking.total_price)}</span>
                {booking.price_per_day && (
                  <span className="text-xs text-muted dark:text-dark-muted">
                    ({formatPrice(booking.price_per_day)}/day)
                  </span>
                )}
              </div>
            )}
            {(booking.user_full_name || booking.user_phone) && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted dark:text-dark-muted">
                {booking.user_full_name && <span>Name: {booking.user_full_name}</span>}
                {booking.user_phone && <span>Phone: {booking.user_phone}</span>}
              </div>
            )}
          </div>
        </div>
        {statusInfo.canModify && !isPast && (
          <div className="flex gap-2 sm:flex-col">
            <Button variant="outline" onClick={() => onEdit(booking)}>
              Edit
            </Button>
            <Button
              variant="outline"
              className="!border-red-200 !text-red-600 hover:!border-red-400 hover:!bg-red-50 dark:!border-red-700 dark:!text-red-400 dark:hover:!border-red-600 dark:hover:!bg-red-900/30"
              onClick={() => onCancel(booking)}
            >
              Cancel
            </Button>
          </div>
        )}
        {booking.status === "rejected" && (
          <div className="flex items-center">
            <span className="text-xs text-red-500 dark:text-red-400">This booking was not approved</span>
          </div>
        )}
      </div>
    </Card>
  );
});

const EditBookingModal = React.memo(({ open, booking, room, onClose, onSave }) => {
  const dispatch = useDispatch();
  const [date, setDate] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Use the price stored at booking time, not the current room price
  const pricePerDay = booking?.price_per_day ?? room?.price_per_day ?? 0;
  const totalPrice = booking?.total_price ?? pricePerDay;

  useEffect(() => {
    if (booking && open) {
      setDate(booking.booking_date || "");
      setFullName(booking.user_full_name || "");
      setPhone(booking.user_phone || "");
      setError("");
    }
  }, [booking, open]);

  const handleSave = useCallback(async () => {
    setError("");
    if (!date) {
      setError("Please select a date.");
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        updateBooking({
          id: booking.id,
          booking_date: date,
          user_full_name: fullName.trim() || null,
          user_phone: phone.trim() || null,
        })
      ).unwrap();
      onSave();
    } catch (err) {
      setError(err || "Failed to update booking.");
    } finally {
      setSaving(false);
    }
  }, [booking?.id, date, dispatch, fullName, onSave, phone, pricePerDay, totalPrice]);

  return (
    <Modal title="Edit Booking" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        {room && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3">
            {room.image && <img src={room.image} alt={room.title} className="h-12 w-12 rounded-lg object-cover" />}
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
            onChange={(_, dateString) => { setDate(dateString || ""); setError(""); }}
            disabledDate={(current) => current && current < dayjs().startOf("day")}
          />
        </label>

        {pricePerDay > 0 && (
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/30">
            <div className="flex justify-between">
              <span className="text-muted dark:text-dark-muted">Day Rate</span>
              <span className="text-lg font-bold text-brand-700 dark:text-brand-400">{formatPrice(totalPrice)}</span>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          <FormInput label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

const CancelBookingModal = React.memo(({ open, booking, room, onClose, onConfirm }) => {
  const dispatch = useDispatch();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = useCallback(async () => {
    setError("");
    setCancelling(true);
    try {
      await dispatch(deleteBooking(booking.id)).unwrap();
      onConfirm();
    } catch (err) {
      setError(err || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  }, [booking?.id, dispatch, onConfirm]);

  return (
    <Modal title="Cancel Booking" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted dark:text-dark-muted">
          Are you sure you want to cancel this booking? This action cannot be undone.
        </p>
        {room && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
            <p className="font-medium text-ink dark:text-dark-ink">{room.title}</p>
            <p className="text-sm text-muted dark:text-dark-muted">{room.location}</p>
            <div className="mt-2 text-sm">
              <span className="text-muted dark:text-dark-muted">Date: </span>
              <span className="font-medium text-ink dark:text-dark-ink">{formatDate(booking?.booking_date)}</span>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Keep Booking</Button>
          <Button className="!bg-red-600 hover:!bg-red-700" onClick={handleConfirm} disabled={cancelling}>
            {cancelling ? "Cancelling..." : "Yes, Cancel Booking"}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

const MyBookings = React.memo(() => {
  const dispatch = useDispatch();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightedBookingId = searchParams.get("highlight");

  const {
    bookings,
    loading,
    error,
  } = useSelector((state) => state.bookings);

  const { rooms: roomsList } = useSelector((state) => state.rooms);

  const [editingBooking, setEditingBooking] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);

  // Build rooms lookup map
  const roomsMap = React.useMemo(() => {
    const map = {};
    (roomsList || []).forEach((r) => { map[r.id] = r; });
    return map;
  }, [roomsList]);

  // Fetch bookings and rooms on mount
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchBookings());
      dispatch(fetchRooms());
    }
  }, [dispatch, user?.id]);

  const handleEdit = useCallback((booking) => setEditingBooking(booking), []);
  const handleCancel = useCallback((booking) => setCancellingBooking(booking), []);

  const handleEditSave = useCallback(() => {
    setEditingBooking(null);
    dispatch(fetchBookings());
  }, [dispatch]);

  const handleCancelConfirm = useCallback(() => {
    setCancellingBooking(null);
    // Booking already removed from store by deleteBooking.fulfilled
  }, []);

  if (authLoading || loading) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink dark:text-dark-ink">Loading bookings...</p>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">Please wait while we fetch your reservations.</p>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink dark:text-dark-ink">Not signed in</p>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">Please sign in to view your bookings.</p>
        <div className="mt-4"><Link to="/auth"><Button>Sign in</Button></Link></div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink dark:text-dark-ink">Error loading bookings</p>
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        <div className="mt-4">
          <Button onClick={() => dispatch(fetchBookings())}>Try Again</Button>
        </div>
      </Card>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const upcomingBookings = bookings.filter(
    (b) => new Date(b.booking_date) >= new Date(new Date().toDateString()) && b.status === "approved"
  );
  const pastBookings = bookings.filter(
    (b) => new Date(b.booking_date) < new Date(new Date().toDateString()) && b.status === "approved"
  );
  const rejectedBookings = bookings.filter((b) => b.status === "rejected");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gradient dark:text-gradient-dark">My Bookings</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink dark:text-dark-ink">Your Reservations</h1>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">Manage your daytime room bookings</p>
        </div>
        <Link to="/"><Button variant="outline">Browse Rooms</Button></Link>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface/60">
              <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-ink dark:text-dark-ink">No bookings yet</p>
            <p className="mt-1 text-sm text-muted dark:text-dark-muted">Start by browsing available rooms and making your first reservation.</p>
            <div className="mt-4"><Link to="/"><Button>Browse Rooms</Button></Link></div>
          </div>
        </Card>
      ) : (
        <>
          {pendingBookings.length > 0 && (
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-dark-ink">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/50">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                </span>
                Pending Approval ({pendingBookings.length})
              </h2>
              <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-3 dark:border-yellow-700 dark:bg-yellow-900/30">
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  These bookings are awaiting admin approval. You'll be notified once they're confirmed.
                </p>
              </div>
              {pendingBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} room={roomsMap[booking.room_id]} onEdit={handleEdit} onCancel={handleCancel} isHighlighted={booking.id === highlightedBookingId} />
              ))}
            </div>
          )}

          {upcomingBookings.length > 0 && (
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-dark-ink">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                  <svg className="h-3 w-3 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                Approved ({upcomingBookings.length})
              </h2>
              {upcomingBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} room={roomsMap[booking.room_id]} onEdit={handleEdit} onCancel={handleCancel} isHighlighted={booking.id === highlightedBookingId} />
              ))}
            </div>
          )}

          {pastBookings.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-ink dark:text-dark-ink">Past ({pastBookings.length})</h2>
              {pastBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} room={roomsMap[booking.room_id]} onEdit={handleEdit} onCancel={handleCancel} isHighlighted={booking.id === highlightedBookingId} />
              ))}
            </div>
          )}

          {rejectedBookings.length > 0 && (
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-dark-ink">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                  <svg className="h-3 w-3 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
                Not Approved ({rejectedBookings.length})
              </h2>
              {rejectedBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} room={roomsMap[booking.room_id]} onEdit={handleEdit} onCancel={handleCancel} isHighlighted={booking.id === highlightedBookingId} />
              ))}
            </div>
          )}
        </>
      )}

      <EditBookingModal
        open={!!editingBooking}
        booking={editingBooking}
        room={editingBooking ? roomsMap[editingBooking.room_id] : null}
        onClose={() => setEditingBooking(null)}
        onSave={handleEditSave}
      />

      <CancelBookingModal
        open={!!cancellingBooking}
        booking={cancellingBooking}
        room={cancellingBooking ? roomsMap[cancellingBooking.room_id] : null}
        onClose={() => setCancellingBooking(null)}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
});

export default MyBookings;
