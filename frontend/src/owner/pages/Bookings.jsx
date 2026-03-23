import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DatePicker, Modal } from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { formatPrice } from "../../guest/utils/format.js";
import Button from "../../components/ui/Button.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Pagination from "../../guest/components/ui/Pagination.jsx";
import { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import useClientPagination from "../../hooks/useClientPagination.js";
import SearchField from "../../components/ui/SearchField.jsx";
import {
  fetchOwnerBookings,
  approveOwnerBooking,
  rejectOwnerBooking,
} from "../../redux/slices/ownerSlice.js";

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

  if (booking.status === "pending") return { color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", text: "Pending" };
  if (booking.status === "rejected") return { color: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400", text: "Rejected" };
  if (booking.status === "approved") {
    if (isPast) return { color: "bg-surface/60 text-muted", text: "Completed" };
    return { color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400", text: "Approved" };
  }
  if (isPast) return { color: "bg-surface/60 text-muted", text: "Completed" };
  return { color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400", text: "Upcoming" };
}

const PAGE_SIZE = 10;

const ApproveModal = React.memo(({ open, booking, onClose, onConfirm }) => {
  const dispatch = useDispatch();
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");

  const handleApprove = useCallback(async () => {
    setError(""); setApproving(true);
    try { await dispatch(approveOwnerBooking(booking.id)).unwrap(); onConfirm(); }
    catch (err) { setError(err || "Failed to approve."); }
    finally { setApproving(false); }
  }, [booking?.id, dispatch, onConfirm]);

  return (
    <Modal title="Approve Booking" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted">Are you sure you want to approve this booking? The guest will be notified.</p>
        {booking && (
          <div className="rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/30">
            <p className="font-medium text-ink">{booking.room?.title || "Room"}</p>
            <div className="mt-2 text-sm"><span className="text-muted">Date: </span><span className="font-medium text-ink">{formatDate(booking.booking_date)}</span></div>
            <div className="text-sm"><span className="text-muted">Guest: </span><span className="font-medium text-ink">{booking.user_full_name || booking.user_email || "N/A"}</span></div>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="!bg-green-600 hover:!bg-green-700" onClick={handleApprove} disabled={approving}>{approving ? "Approving..." : "Approve"}</Button>
        </div>
      </div>
    </Modal>
  );
});

const RejectModal = React.memo(({ open, booking, onClose, onConfirm }) => {
  const dispatch = useDispatch();
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");

  const handleReject = useCallback(async () => {
    setError(""); setRejecting(true);
    try { await dispatch(rejectOwnerBooking({ id: booking.id, reason: reason.trim() || undefined })).unwrap(); setReason(""); onConfirm(); }
    catch (err) { setError(err || "Failed to reject."); }
    finally { setRejecting(false); }
  }, [booking?.id, dispatch, reason, onConfirm]);

  return (
    <Modal title="Reject Booking" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted">Are you sure you want to reject this booking?</p>
        {booking && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
            <p className="font-medium text-ink">{booking.room?.title || "Room"}</p>
            <div className="mt-2 text-sm"><span className="text-muted">Date: </span><span className="font-medium text-ink">{formatDate(booking.booking_date)}</span></div>
          </div>
        )}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted">Reason (optional)</span>
          <textarea className={`${INPUT_STYLES} min-h-[80px] resize-none`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide a reason..." />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="!bg-red-600 hover:!bg-red-700" onClick={handleReject} disabled={rejecting}>{rejecting ? "Rejecting..." : "Reject"}</Button>
        </div>
      </div>
    </Modal>
  );
});

export default function OwnerBookings() {
  const dispatch = useDispatch();
  const { bookings, loading } = useSelector((state) => state.owner);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [approvingBooking, setApprovingBooking] = useState(null);
  const [rejectingBooking, setRejectingBooking] = useState(null);

  useEffect(() => { dispatch(fetchOwnerBookings({ limit: 200 })); }, [dispatch]);

  const filteredBookings = useMemo(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    return (bookings || []).filter((booking) => {
      if (statusFilter === "pending" && booking.status !== "pending") return false;
      if (statusFilter === "approved" && booking.status !== "approved") return false;
      if (statusFilter === "rejected" && booking.status !== "rejected") return false;
      if (statusFilter === "upcoming" && (booking.booking_date < today || booking.status === "rejected")) return false;
      if (statusFilter === "completed" && (booking.booking_date >= today || booking.status === "rejected" || booking.status === "pending")) return false;
      if (dateFilter && booking.booking_date !== dateFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesRoom = booking.room?.title?.toLowerCase().includes(search);
        const matchesGuest = booking.user_full_name?.toLowerCase().includes(search);
        const matchesEmail = booking.user_email?.toLowerCase().includes(search);
        if (!matchesRoom && !matchesGuest && !matchesEmail) return false;
      }
      return true;
    });
  }, [bookings, searchTerm, statusFilter, dateFilter]);

  const pendingCount = useMemo(() => (bookings || []).filter((b) => b.status === "pending").length, [bookings]);
  const {
    currentPage,
    paginatedItems,
    totalPages,
    totalCount,
    goToPage,
    resetPagination,
  } = useClientPagination(filteredBookings, PAGE_SIZE);
  const refreshData = useCallback(() => { dispatch(fetchOwnerBookings({ limit: 200 })); }, [dispatch]);

  useEffect(() => {
    resetPagination();
  }, [searchTerm, statusFilter, dateFilter, resetPagination]);

  if (loading && (!bookings || bookings.length === 0)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm text-muted">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle={
          <>
            Manage reservations on your properties ({(bookings || []).length} total)
            {pendingCount > 0 && <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">{pendingCount} pending</span>}
          </>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        <SearchField
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClear={() => setSearchTerm("")}
          placeholder="Search by room, guest name, email..."
          className="flex-1"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={INPUT_STYLES}>
          <option value="all">All Bookings</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
        </select>
        <DatePicker
          className={INPUT_STYLES}
          placeholder="Filter by date"
          value={dateFilter ? dayjs(dateFilter) : null}
          onChange={(_, dateString) => setDateFilter(dateString || "")}
        />
        {dateFilter && (
          <Button variant="outline" onClick={() => setDateFilter("")}>
            Clear Date
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-sm">
        {filteredBookings.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-ink">No bookings found</p>
            <p className="mt-1 text-sm text-muted">{searchTerm || statusFilter !== "all" ? "Try adjusting your filters" : "Bookings will appear here when guests book your rooms"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-6 py-3">Room</th>
                  <th className="px-6 py-3">Guest</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((booking) => {
                  const statusInfo = getBookingStatusInfo(booking);
                  const isPending = booking.status === "pending";
                  return (
                    <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-surface/60">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {booking.room?.image && <img src={booking.room.image} alt={booking.room?.title} className="h-10 w-10 rounded-lg object-cover" />}
                          <div>
                            <p className="font-medium text-ink">{booking.room?.title || "Unknown"}</p>
                            <p className="text-xs text-muted">{booking.room?.location || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-ink">{booking.user_full_name || "Guest"}</p>
                        <p className="text-xs text-muted">{booking.user_email || "N/A"}</p>
                      </td>
                      <td className="px-6 py-4"><p className="text-sm text-ink">{formatDate(booking.booking_date)}</p></td>
                      <td className="px-6 py-4"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>{statusInfo.text}</span></td>
                      <td className="px-6 py-4"><span className="font-medium text-ink">{formatPrice(booking.total_price || 0)}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {isPending && (
                            <>
                              <button onClick={() => setApprovingBooking(booking)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-green-50 hover:text-green-600" title="Approve">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              </button>
                              <button onClick={() => setRejectingBooking(booking)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600" title="Reject">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </>
                          )}
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={goToPage}
        itemLabel="bookings"
      />

      <ApproveModal open={!!approvingBooking} booking={approvingBooking} onClose={() => setApprovingBooking(null)} onConfirm={() => { setApprovingBooking(null); refreshData(); }} />
      <RejectModal open={!!rejectingBooking} booking={rejectingBooking} onClose={() => setRejectingBooking(null)} onConfirm={() => { setRejectingBooking(null); refreshData(); }} />
    </div>
  );
}
