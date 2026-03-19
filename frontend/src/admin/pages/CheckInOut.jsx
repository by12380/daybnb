import React, { useCallback, useEffect, useState } from "react";
import { Modal } from "antd";
import { useDispatch, useSelector } from "react-redux";
import PageHeader from "../../components/ui/PageHeader.jsx";
import { formatPrice } from "../../guest/utils/format.js";
import Button from "../../components/ui/Button.jsx";
import Pagination from "../../guest/components/ui/Pagination.jsx";
import useClientPagination from "../../hooks/useClientPagination.js";
import {
  fetchTodayBookings,
  checkInBooking,
  checkOutBooking,
} from "../../redux/slices/bookingSlice.js";

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

function getStatusBadge(status) {
  switch (status) {
    case "approved":
    case "confirmed":
      return { color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", text: "Awaiting Check-In" };
    case "checked_in":
      return { color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400", text: "Checked In" };
    default:
      return { color: "bg-surface/60 text-muted", text: status };
  }
}

const PAGE_SIZE = 5;

const ConfirmModal = React.memo(({ open, booking, action, onClose, onConfirm }) => {
  const dispatch = useDispatch();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const isCheckIn = action === "check-in";
  const title = isCheckIn ? "Confirm Check-In" : "Confirm Check-Out";
  const description = isCheckIn
    ? "Are you sure you want to check in this guest?"
    : "Are you sure you want to check out this guest?";

  const handleConfirm = useCallback(async () => {
    setError("");
    setProcessing(true);
    try {
      const thunk = isCheckIn ? checkInBooking : checkOutBooking;
      await dispatch(thunk(booking.id)).unwrap();
      onConfirm();
    } catch (err) {
      setError(err || `Failed to ${action}.`);
    } finally {
      setProcessing(false);
    }
  }, [booking?.id, dispatch, isCheckIn, action, onConfirm]);

  return (
    <Modal title={title} open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted">{description}</p>
        {booking && (
          <div className={`rounded-xl border p-4 ${isCheckIn ? "border-green-100 bg-green-50 dark:border-green-800 dark:bg-green-900/30" : "border-blue-100 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30"}`}>
            <p className="font-medium text-ink dark:text-dark-ink">{booking.room?.title || "Room"}</p>
            <p className="text-sm text-muted">{booking.room?.location || ""}</p>
            <div className="mt-2 space-y-1 text-sm">
              <div><span className="text-muted">Guest: </span><span className="font-medium text-ink dark:text-dark-ink">{booking.user_full_name || booking.user_email || "N/A"}</span></div>
              <div><span className="text-muted">Date: </span><span className="font-medium text-ink dark:text-dark-ink">{formatDate(booking.booking_date)}</span></div>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className={isCheckIn ? "!bg-green-600 hover:!bg-green-700" : "!bg-blue-600 hover:!bg-blue-700"}
            onClick={handleConfirm}
            disabled={processing}
          >
            {processing ? "Processing..." : isCheckIn ? "Check In" : "Check Out"}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

export default function AdminCheckInOut() {
  const dispatch = useDispatch();
  const { todayBookings, todayLoading } = useSelector((state) => state.bookings);

  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    dispatch(fetchTodayBookings());
  }, [dispatch]);

  const refreshData = useCallback(() => {
    dispatch(fetchTodayBookings());
  }, [dispatch]);

  const handleAction = useCallback((booking, action) => {
    setSelectedBooking(booking);
    setConfirmAction(action);
  }, []);

  const handleConfirm = useCallback(() => {
    setConfirmAction(null);
    setSelectedBooking(null);
    refreshData();
  }, [refreshData]);

  const handleClose = useCallback(() => {
    setConfirmAction(null);
    setSelectedBooking(null);
  }, []);

  const awaitingCount = (todayBookings || []).filter((b) => ["approved", "confirmed"].includes(b.status)).length;
  const checkedInCount = (todayBookings || []).filter((b) => b.status === "checked_in").length;
  const filteredBookings = (todayBookings || []).filter((booking) => {
    if (statusFilter === "awaiting") return ["approved", "confirmed"].includes(booking.status);
    if (statusFilter === "checked_in") return booking.status === "checked_in";
    return true;
  });
  const {
    currentPage,
    paginatedItems,
    totalPages,
    totalCount,
    goToPage,
    resetPagination,
  } = useClientPagination(filteredBookings, PAGE_SIZE);

  useEffect(() => {
    resetPagination();
  }, [statusFilter, todayBookings, resetPagination]);

  const cardClassName = (cardKey, baseClassName, activeClassName) => {
    const isActive = statusFilter === cardKey;
    return `${baseClassName} cursor-pointer transition ${
      isActive ? `${activeClassName} border-2 shadow-md` : "hover:-translate-y-0.5 hover:shadow-md"
    }`;
  };

  if (todayLoading && (!todayBookings || todayBookings.length === 0)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading today's bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-In / Check-Out"
        subtitle="Manage today's guest arrivals and departures"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <button type="button" onClick={() => setStatusFilter("all")} className={cardClassName("all", "rounded-2xl border border-border bg-panel p-5 text-left shadow-sm", "border-border")}>
          <p className="text-sm font-medium text-muted">Total Today</p>
          <p className="mt-1 text-3xl font-bold text-ink dark:text-dark-ink">{(todayBookings || []).length}</p>
        </button>
        <button type="button" onClick={() => setStatusFilter("awaiting")} className={cardClassName("awaiting", "rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left shadow-sm dark:border-amber-800 dark:bg-amber-900/20", "border-amber-300 dark:border-amber-700")}>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Awaiting Check-In</p>
          <p className="mt-1 text-3xl font-bold text-amber-700 dark:text-amber-400">{awaitingCount}</p>
        </button>
        <button type="button" onClick={() => setStatusFilter("checked_in")} className={cardClassName("checked_in", "rounded-2xl border border-green-200 bg-green-50 p-5 text-left shadow-sm dark:border-green-800 dark:bg-green-900/20", "border-green-300 dark:border-green-700")}>
          <p className="text-sm font-medium text-green-700 dark:text-green-400">Checked In</p>
          <p className="mt-1 text-3xl font-bold text-green-700 dark:text-green-400">{checkedInCount}</p>
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-sm">
        {filteredBookings.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="mx-auto h-12 w-12 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-4 text-sm font-medium text-ink dark:text-dark-ink">No bookings match this filter</p>
            <p className="mt-1 text-sm text-muted">
              {statusFilter === "all" ? "Guests with approved bookings for today will appear here" : "Try another status card to view more bookings"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-6 py-3">Room</th>
                  <th className="px-6 py-3">Guest</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((booking) => {
                  const statusBadge = getStatusBadge(booking.status);
                  const canCheckIn = ["approved", "confirmed"].includes(booking.status);
                  const canCheckOut = booking.status === "checked_in";

                  return (
                    <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-surface/60">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {booking.room?.image && <img src={booking.room.image} alt={booking.room?.title} className="h-10 w-10 rounded-lg object-cover" />}
                          <div>
                            <p className="font-medium text-ink dark:text-dark-ink">{booking.room?.title || "Unknown"}</p>
                            <p className="text-xs text-muted">{booking.room?.location || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-ink dark:text-dark-ink">{booking.user_full_name || "Guest"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-ink dark:text-dark-ink">{booking.user_email || "N/A"}</p>
                        {booking.user_phone && <p className="text-xs text-muted">{booking.user_phone}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge.color}`}>{statusBadge.text}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-ink dark:text-dark-ink">{formatPrice(booking.total_price || 0)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {canCheckIn && (
                            <button
                              onClick={() => handleAction(booking, "check-in")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                              </svg>
                              Check In
                            </button>
                          )}
                          {canCheckOut && (
                            <button
                              onClick={() => handleAction(booking, "check-out")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              Check Out
                            </button>
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

      <ConfirmModal
        open={!!confirmAction}
        booking={selectedBooking}
        action={confirmAction}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
