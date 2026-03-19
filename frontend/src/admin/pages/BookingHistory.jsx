import React, { useCallback, useEffect, useState } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import PageHeader from "../../components/ui/PageHeader.jsx";
import { formatPrice } from "../../guest/utils/format.js";
import Button from "../../components/ui/Button.jsx";
import Pagination from "../../guest/components/ui/Pagination.jsx";
import { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import useClientPagination from "../../hooks/useClientPagination.js";
import {
  fetchBookingHistory,
  clearHistoryBookings,
} from "../../redux/slices/bookingSlice.js";

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

const TABS = [
  { key: "no_show", label: "No-Show", color: "amber" },
  { key: "completed", label: "Completed", color: "green" },
  { key: "rejected", label: "Rejected", color: "red" },
  { key: "cancelled", label: "Cancelled by Guest", color: "gray" },
];

const PAGE_SIZE = 5;

function getTabStatusBadge(tab, booking) {
  switch (tab) {
    case "no_show": {
      if (booking.status === "pending") return { color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", text: "Pending (Never Reviewed)" };
      return { color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", text: "No-Show" };
    }
    case "completed":
      return { color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400", text: "Completed" };
    case "rejected":
      return { color: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400", text: "Rejected" };
    case "cancelled":
      return { color: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400", text: "Cancelled" };
    default:
      return { color: "bg-surface/60 text-muted", text: booking.status };
  }
}

export default function AdminBookingHistory() {
  const dispatch = useDispatch();
  const { historyBookings, historyTotal, historyLoading } = useSelector((state) => state.bookings);

  const [activeTab, setActiveTab] = useState("no_show");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    dispatch(fetchBookingHistory({ tab: activeTab, limit: 200 }));
    return () => { dispatch(clearHistoryBookings()); };
  }, [dispatch, activeTab]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setSearchTerm("");
    setDateFilter("");
  }, []);

  const filteredBookings = React.useMemo(() => {
    return (historyBookings || []).filter((b) => {
      if (dateFilter && b.booking_date !== dateFilter) return false;
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      const matchesRoom = b.room?.title?.toLowerCase().includes(search);
      const matchesGuest = b.user_full_name?.toLowerCase().includes(search);
      const matchesEmail = b.user_email?.toLowerCase().includes(search);
      return matchesRoom || matchesGuest || matchesEmail;
    });
  }, [historyBookings, searchTerm, dateFilter]);

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
  }, [activeTab, searchTerm, dateFilter, resetPagination]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Booking History"
        subtitle="Review past booking outcomes and statuses"
      />

      <div className="flex flex-wrap gap-2 border-b border-border pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? `border-b-2 border-brand-600 text-brand-700 dark:text-brand-400`
                : "text-muted hover:text-ink dark:hover:text-dark-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by room, guest name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${INPUT_STYLES} w-full`}
          />
        </div>
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
        <div className="text-sm text-muted self-center">
          {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-sm">
        {historyLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
              <p className="mt-4 text-sm text-muted">Loading...</p>
            </div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="mx-auto h-12 w-12 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-sm font-medium text-ink dark:text-dark-ink">No {TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} bookings</p>
            <p className="mt-1 text-sm text-muted">
              {searchTerm ? "Try adjusting your search" : "No bookings match this category yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-6 py-3">Room</th>
                  <th className="px-6 py-3">Guest</th>
                  <th className="px-6 py-3">Booking Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((booking) => {
                  const statusBadge = getTabStatusBadge(activeTab, booking);
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
                        <p className="text-xs text-muted">{booking.user_email || "N/A"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-ink dark:text-dark-ink">{formatDate(booking.booking_date)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge.color}`}>{statusBadge.text}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-ink dark:text-dark-ink">{formatPrice(booking.total_price || 0)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-muted">{booking.created_at ? new Date(booking.created_at).toLocaleDateString() : "N/A"}</p>
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
    </div>
  );
}
