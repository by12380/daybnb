import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, DatePicker } from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { formatPrice } from "../../guest/utils/format.js";
import Button from "../../guest/components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import {
  fetchBookings,
  updateBooking,
  approveBooking,
  rejectBooking,
  deleteBooking,
} from "../../redux/slices/bookingSlice.js";
import { fetchRooms } from "../../redux/slices/roomSlice.js";
import { fetchUsers } from "../../redux/slices/userSlice.js";

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

function getBookingStatusInfo(booking) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isPast = booking.booking_date < today;

  if (booking.status === "pending") return { color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", text: "Pending Approval" };
  if (booking.status === "rejected") return { color: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400", text: "Rejected" };
  if (booking.status === "approved") {
    if (isPast) return { color: "bg-surface/60 text-muted", text: "Completed" };
    return { color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400", text: "Approved" };
  }
  if (isPast) return { color: "bg-surface/60 text-muted", text: "Completed" };
  return { color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400", text: "Upcoming" };
}

const ViewBookingModal = React.memo(({ open, booking, room, userProfile, onClose }) => {
  if (!booking) return null;
  const statusInfo = getBookingStatusInfo(booking);

  return (
    <Modal title="Booking Details" open={open} onCancel={onClose} footer={<Button variant="outline" onClick={onClose}>Close</Button>} destroyOnClose>
      <div className="space-y-4 pt-4">
        {room && (
          <div className="flex items-center gap-4 rounded-xl border border-border bg-surface/60 p-4">
            {room.image && <img src={room.image} alt={room.title} className="h-16 w-16 rounded-lg object-cover" />}
            <div><p className="font-semibold text-ink dark:text-dark-ink">{room.title}</p><p className="text-sm text-muted dark:text-dark-muted">{room.location}</p></div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted dark:text-dark-muted">Status:</span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color}`}>{statusInfo.text}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><p className="text-xs font-medium text-muted">Date</p><p className="mt-1 text-sm font-medium text-ink">{formatDate(booking.booking_date)}</p></div>
          <div><p className="text-xs font-medium text-muted">Guest Name</p><p className="mt-1 text-sm font-medium text-ink">{booking.user_full_name || userProfile?.full_name || "N/A"}</p></div>
          <div><p className="text-xs font-medium text-muted">Phone</p><p className="mt-1 text-sm font-medium text-ink">{booking.user_phone || userProfile?.phone || "N/A"}</p></div>
          <div className="sm:col-span-2"><p className="text-xs font-medium text-muted">Email</p><p className="mt-1 text-sm font-medium text-ink">{userProfile?.email || booking.user_email || "N/A"}</p></div>
        </div>
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/30">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink">Total Amount</span>
            <span className="text-xl font-bold text-brand-700 dark:text-brand-400">{formatPrice(booking.total_price || 0)}</span>
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted">Booking ID: <span className="font-mono">{booking.id}</span></p>
          <p className="text-xs text-muted">User ID: <span className="font-mono">{booking.user_id}</span></p>
          {booking.created_at && <p className="text-xs text-muted">Created: {new Date(booking.created_at).toLocaleString()}</p>}
        </div>
      </div>
    </Modal>
  );
});

const EditBookingModal = React.memo(({ open, booking, room, onClose, onSave }) => {
  const dispatch = useDispatch();
  const [date, setDate] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pricePerDay = room?.price_per_day ?? room?.price_per_hour ?? 0;
  const totalPrice = pricePerDay;

  useEffect(() => {
    if (booking && open) { setDate(booking.booking_date || ""); setFullName(booking.user_full_name || ""); setPhone(booking.user_phone || ""); setError(""); }
  }, [booking, open]);

  const handleSave = useCallback(async () => {
    setError("");
    if (!date) { setError("Please select a date."); return; }
    setSaving(true);
    try {
      await dispatch(updateBooking({ id: booking.id, booking_date: date, user_full_name: fullName.trim() || null, user_phone: phone.trim() || null, total_price: totalPrice > 0 ? totalPrice : null, price_per_day: pricePerDay > 0 ? pricePerDay : null })).unwrap();
      onSave();
    } catch (err) { setError(err || "Failed to update booking."); }
    finally { setSaving(false); }
  }, [booking?.id, date, dispatch, fullName, onSave, phone, pricePerDay, totalPrice]);

  return (
    <Modal title="Edit Booking" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        {room && (<div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3">{room.image && <img src={room.image} alt={room.title} className="h-12 w-12 rounded-lg object-cover" />}<div><p className="font-medium text-ink">{room.title}</p><p className="text-xs text-muted">{room.location}</p></div></div>)}
        <label className="flex flex-col gap-2"><span className="text-sm font-medium text-muted">Date</span><DatePicker className={INPUT_STYLES} placeholder="Select date" value={date ? dayjs(date) : null} onChange={(_, ds) => { setDate(ds || ""); setError(""); }} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput label="Guest Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Guest name" />
          <FormInput label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
        </div>
        {pricePerDay > 0 && (<div className="rounded-xl border border-brand-100 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/30"><div className="flex items-center justify-between"><span className="text-sm text-muted">Day rate</span><span className="text-lg font-bold text-brand-700">{formatPrice(totalPrice)}</span></div></div>)}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button></div>
      </div>
    </Modal>
  );
});

const DeleteBookingModal = React.memo(({ open, booking, room, onClose, onConfirm }) => {
  const dispatch = useDispatch();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = useCallback(async () => {
    setError(""); setDeleting(true);
    try { await dispatch(deleteBooking(booking.id)).unwrap(); onConfirm(); }
    catch (err) { setError(err || "Failed to delete booking."); }
    finally { setDeleting(false); }
  }, [booking?.id, dispatch, onConfirm]);

  return (
    <Modal title="Delete Booking" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted">Are you sure you want to delete this booking? This action cannot be undone.</p>
        {room && (<div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30"><p className="font-medium text-ink">{room.title}</p><p className="text-sm text-muted">{room.location}</p><div className="mt-2 text-sm"><span className="text-muted">Date: </span><span className="font-medium text-ink">{formatDate(booking?.booking_date)}</span></div></div>)}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button className="!bg-red-600 hover:!bg-red-700" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete Booking"}</Button></div>
      </div>
    </Modal>
  );
});

const ApproveBookingModal = React.memo(({ open, booking, room, onClose, onConfirm }) => {
  const dispatch = useDispatch();
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");

  const handleApprove = useCallback(async () => {
    setError(""); setApproving(true);
    try { await dispatch(approveBooking(booking.id)).unwrap(); onConfirm(); }
    catch (err) { setError(err || "Failed to approve booking."); }
    finally { setApproving(false); }
  }, [booking?.id, dispatch, onConfirm]);

  return (
    <Modal title="Approve Booking" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted">Are you sure you want to approve this booking? The guest will be notified.</p>
        {room && (<div className="rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/30"><p className="font-medium text-ink">{room.title}</p><p className="text-sm text-muted">{room.location}</p><div className="mt-2 text-sm"><span className="text-muted">Date: </span><span className="font-medium text-ink">{formatDate(booking?.booking_date)}</span></div><div className="text-sm"><span className="text-muted">Guest: </span><span className="font-medium text-ink">{booking?.user_full_name || booking?.user_email || "N/A"}</span></div></div>)}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button className="!bg-green-600 hover:!bg-green-700" onClick={handleApprove} disabled={approving}>{approving ? "Approving..." : "Approve Booking"}</Button></div>
      </div>
    </Modal>
  );
});

const RejectBookingModal = React.memo(({ open, booking, room, onClose, onConfirm }) => {
  const dispatch = useDispatch();
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");

  const handleReject = useCallback(async () => {
    setError(""); setRejecting(true);
    try { await dispatch(rejectBooking({ id: booking.id, reason: reason.trim() || undefined })).unwrap(); setReason(""); onConfirm(); }
    catch (err) { setError(err || "Failed to reject booking."); }
    finally { setRejecting(false); }
  }, [booking?.id, dispatch, reason, onConfirm]);

  return (
    <Modal title="Reject Booking" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted">Are you sure you want to reject this booking? The guest will be notified.</p>
        {room && (<div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30"><p className="font-medium text-ink">{room.title}</p><p className="text-sm text-muted">{room.location}</p><div className="mt-2 text-sm"><span className="text-muted">Date: </span><span className="font-medium text-ink">{formatDate(booking?.booking_date)}</span></div></div>)}
        <label className="flex flex-col gap-2"><span className="text-sm font-medium text-muted">Reason (optional)</span><textarea className={`${INPUT_STYLES} min-h-[80px] resize-none`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide a reason for rejection..." /></label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button className="!bg-red-600 hover:!bg-red-700" onClick={handleReject} disabled={rejecting}>{rejecting ? "Rejecting..." : "Reject Booking"}</Button></div>
      </div>
    </Modal>
  );
});

export default function AdminBookings() {
  const dispatch = useDispatch();
  const { bookings, loading } = useSelector((state) => state.bookings);
  const { rooms: roomsList } = useSelector((state) => state.rooms);
  const { users: usersList } = useSelector((state) => state.users);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewingBooking, setViewingBooking] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [deletingBooking, setDeletingBooking] = useState(null);
  const [approvingBooking, setApprovingBooking] = useState(null);
  const [rejectingBooking, setRejectingBooking] = useState(null);

  useEffect(() => {
    dispatch(fetchBookings({ limit: 200 }));
    dispatch(fetchRooms());
    dispatch(fetchUsers());
  }, [dispatch]);

  const roomsMap = useMemo(() => { const m = {}; (roomsList || []).forEach((r) => { m[r.id] = r; }); return m; }, [roomsList]);
  const usersMap = useMemo(() => { const m = {}; (usersList || []).forEach((u) => { m[u.id] = u; }); return m; }, [usersList]);

  const filteredBookings = useMemo(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    return (bookings || []).filter((booking) => {
      if (statusFilter === "pending" && booking.status !== "pending") return false;
      if (statusFilter === "approved" && booking.status !== "approved") return false;
      if (statusFilter === "rejected" && booking.status !== "rejected") return false;
      if (statusFilter === "upcoming") { if (booking.booking_date < today || booking.status === "rejected") return false; }
      if (statusFilter === "completed") { if (booking.booking_date >= today || booking.status === "rejected" || booking.status === "pending") return false; }
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const room = roomsMap[booking.room_id];
        const profile = usersMap[booking.user_id];
        const matchesRoom = room?.title?.toLowerCase().includes(search);
        const matchesGuest = booking.user_full_name?.toLowerCase().includes(search) || profile?.full_name?.toLowerCase().includes(search);
        const matchesEmail = booking.user_email?.toLowerCase?.().includes(search) || profile?.email?.toLowerCase?.().includes(search);
        if (!matchesRoom && !matchesGuest && !matchesEmail) return false;
      }
      return true;
    });
  }, [bookings, roomsMap, usersMap, searchTerm, statusFilter]);

  const pendingCount = useMemo(() => (bookings || []).filter((b) => b.status === "pending").length, [bookings]);

  const refreshData = useCallback(() => { dispatch(fetchBookings({ limit: 200 })); }, [dispatch]);

  const handleEditSave = useCallback(() => { setEditingBooking(null); refreshData(); }, [refreshData]);
  const handleDeleteConfirm = useCallback(() => { setDeletingBooking(null); }, []);
  const handleApproveConfirm = useCallback(() => { setApprovingBooking(null); refreshData(); }, [refreshData]);
  const handleRejectConfirm = useCallback(() => { setRejectingBooking(null); refreshData(); }, [refreshData]);

  if (loading) {
    return (<div className="flex h-64 items-center justify-center"><div className="text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /><p className="mt-4 text-sm text-muted">Loading bookings...</p></div></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink dark:text-dark-ink">Bookings</h1>
          <p className="mt-1 text-sm text-muted">Manage all reservations ({(bookings || []).length} total)
            {pendingCount > 0 && <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">{pendingCount} pending approval</span>}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1"><input type="text" placeholder="Search by room, guest name, email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${INPUT_STYLES} w-full`} /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={INPUT_STYLES}>
          <option value="all">All Bookings</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-sm">
        {filteredBookings.length === 0 ? (
          <div className="py-12 text-center"><p className="mt-4 text-sm font-medium text-ink">No bookings found</p><p className="mt-1 text-sm text-muted">{searchTerm || statusFilter !== "all" ? "Try adjusting your filters" : "Bookings will appear here when guests make reservations"}</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wider text-muted"><th className="px-6 py-3">Room</th><th className="px-6 py-3">Guest</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3 text-right">Actions</th></tr></thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const room = roomsMap[booking.room_id];
                  const profile = usersMap[booking.user_id];
                  const statusInfo = getBookingStatusInfo(booking);
                  const isPending = booking.status === "pending";

                  return (
                    <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-surface/60">
                      <td className="px-6 py-4"><div className="flex items-center gap-3">{room?.image && <img src={room.image} alt={room?.title} className="h-10 w-10 rounded-lg object-cover" />}<div><p className="font-medium text-ink">{room?.title || "Unknown"}</p><p className="text-xs text-muted">{room?.location || "N/A"}</p></div></div></td>
                      <td className="px-6 py-4"><p className="text-sm font-medium text-ink">{booking.user_full_name || profile?.full_name || "Guest"}</p><p className="text-xs text-muted">{profile?.email || booking.user_email || "N/A"}</p></td>
                      <td className="px-6 py-4"><p className="text-sm text-ink">{formatDate(booking.booking_date)}</p></td>
                      <td className="px-6 py-4"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>{statusInfo.text}</span></td>
                      <td className="px-6 py-4"><span className="font-medium text-ink">{formatPrice(booking.total_price || 0)}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {isPending && (
                            <>
                              <button onClick={() => setApprovingBooking(booking)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-green-50 hover:text-green-600" title="Approve"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
                              <button onClick={() => setRejectingBooking(booking)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600" title="Reject"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </>
                          )}
                          <button onClick={() => setViewingBooking(booking)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface/60 hover:text-ink" title="View"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                          <button onClick={() => setEditingBooking(booking)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-blue-50 hover:text-blue-600" title="Edit"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                          <button onClick={() => setDeletingBooking(booking)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600" title="Delete"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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

      <ViewBookingModal open={!!viewingBooking} booking={viewingBooking} room={viewingBooking ? roomsMap[viewingBooking.room_id] : null} userProfile={viewingBooking ? usersMap[viewingBooking.user_id] : null} onClose={() => setViewingBooking(null)} />
      <EditBookingModal open={!!editingBooking} booking={editingBooking} room={editingBooking ? roomsMap[editingBooking.room_id] : null} onClose={() => setEditingBooking(null)} onSave={handleEditSave} />
      <DeleteBookingModal open={!!deletingBooking} booking={deletingBooking} room={deletingBooking ? roomsMap[deletingBooking.room_id] : null} onClose={() => setDeletingBooking(null)} onConfirm={handleDeleteConfirm} />
      <ApproveBookingModal open={!!approvingBooking} booking={approvingBooking} room={approvingBooking ? roomsMap[approvingBooking.room_id] : null} onClose={() => setApprovingBooking(null)} onConfirm={handleApproveConfirm} />
      <RejectBookingModal open={!!rejectingBooking} booking={rejectingBooking} room={rejectingBooking ? roomsMap[rejectingBooking.room_id] : null} onClose={() => setRejectingBooking(null)} onConfirm={handleRejectConfirm} />
    </div>
  );
}
