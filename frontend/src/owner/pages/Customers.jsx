import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { formatPrice } from "../../guest/utils/format.js";
import Button from "../../components/ui/Button.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import {
  fetchOwnerCustomers,
  fetchOwnerCustomerBookings,
  clearCustomerBookings,
} from "../../redux/slices/ownerSlice.js";

const ViewCustomerModal = React.memo(({ open, customer, bookings, loadingBookings, onClose }) => {
  if (!customer) return null;

  const totalSpent = (bookings || []).reduce((sum, b) => sum + (b.total_price || 0), 0);

  return (
    <Modal title="Customer Details" open={open} onCancel={onClose} footer={<Button variant="outline" onClick={onClose}>Close</Button>} destroyOnClose width={600}>
      <div className="space-y-6 pt-4">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            {(customer.full_name || customer.email || "C").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-ink">{customer.full_name || "No name"}</h3>
            <p className="text-sm text-muted">{customer.email}</p>
            {customer.phone && <p className="text-sm text-muted">{customer.phone}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-surface/60 p-4 text-center">
            <p className="text-2xl font-bold text-ink">{(bookings || []).length}</p>
            <p className="text-xs text-muted">Bookings on your rooms</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-900/30">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatPrice(totalSpent)}</p>
            <p className="text-xs text-muted">Total Spent</p>
          </div>
        </div>

        {loadingBookings ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
          </div>
        ) : (bookings || []).length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium text-ink">Bookings on Your Rooms</h4>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {bookings.map((booking) => {
                const isPast = new Date(booking.booking_date) < new Date(new Date().toDateString());
                return (
                  <div key={booking.id} className="flex items-center justify-between rounded-lg border border-border bg-panel p-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{booking.room?.title || "Room"}</p>
                      <p className="text-xs text-muted">
                        {new Date(booking.booking_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-ink">{formatPrice(booking.total_price || 0)}</p>
                      <span className={`text-xs ${
                        booking.status === "pending" ? "text-yellow-600" :
                        booking.status === "rejected" ? "text-red-500" :
                        isPast ? "text-slate-500" : "text-green-600"
                      }`}>
                        {booking.status === "pending" ? "Pending" :
                         booking.status === "rejected" ? "Rejected" :
                         isPast ? "Completed" : "Approved"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted">No bookings found for this customer on your rooms.</p>
        )}

        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted">Customer ID: <span className="font-mono">{customer.id}</span></p>
          {customer.created_at && (
            <p className="text-xs text-muted">
              Joined: {new Date(customer.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
});

export default function OwnerCustomers() {
  const dispatch = useDispatch();
  const { customers, customerBookings, loading } = useSelector((state) => state.owner);

  const [searchTerm, setSearchTerm] = useState("");
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => { dispatch(fetchOwnerCustomers()); }, [dispatch]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers || [];
    const search = searchTerm.toLowerCase();
    return (customers || []).filter((c) =>
      c.full_name?.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.phone?.includes(search)
    );
  }, [customers, searchTerm]);

  const handleViewCustomer = useCallback(async (customer) => {
    setViewingCustomer(customer);
    setLoadingBookings(true);
    try {
      await dispatch(fetchOwnerCustomerBookings(customer.id)).unwrap();
    } catch {
      // ignore
    }
    setLoadingBookings(false);
  }, [dispatch]);

  const handleCloseModal = useCallback(() => {
    setViewingCustomer(null);
    dispatch(clearCustomerBookings());
  }, [dispatch]);

  if (loading && (!customers || customers.length === 0)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm text-muted">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle={`Guests who have booked your properties (${(customers || []).length} total)`}
      />

      <div className="flex-1">
        <input type="text" placeholder="Search by name, email, or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${INPUT_STYLES} w-full max-w-md`} />
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel py-12 text-center shadow-sm">
          <p className="text-sm font-medium text-ink">No customers found</p>
          <p className="mt-1 text-sm text-muted">{searchTerm ? "Try adjusting your search" : "Customers will appear here when they book your rooms"}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="rounded-2xl border border-border bg-panel p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {(customer.full_name || customer.email || "C").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{customer.full_name || "No name"}</p>
                  <p className="truncate text-sm text-muted">{customer.email}</p>
                </div>
              </div>
              {customer.phone && <p className="mt-3 text-sm text-muted">{customer.phone}</p>}
              <div className="mt-4 border-t border-border pt-4">
                <button
                  onClick={() => handleViewCustomer(customer)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ViewCustomerModal
        open={!!viewingCustomer}
        customer={viewingCustomer}
        bookings={customerBookings}
        loadingBookings={loadingBookings}
        onClose={handleCloseModal}
      />
    </div>
  );
}
