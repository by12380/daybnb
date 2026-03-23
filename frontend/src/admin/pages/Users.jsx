import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import { useDispatch, useSelector } from "react-redux";
import PageHeader from "../../components/ui/PageHeader.jsx";
import { formatPrice } from "../../guest/utils/format.js";
import Button from "../../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import SearchField from "../../components/ui/SearchField.jsx";
import { fetchUsers, updateUser, deleteUser } from "../../redux/slices/userSlice.js";
import { fetchBookings } from "../../redux/slices/bookingSlice.js";
import { fetchRooms } from "../../redux/slices/roomSlice.js";
import api from "../../redux/api.js";

const ViewUserModal = React.memo(({ open, user, bookings, onClose }) => {
  if (!user) return null;
  const totalSpent = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const upcomingBookings = bookings.filter((b) => new Date(b.booking_date) >= new Date(new Date().toDateString()));

  return (
    <Modal title="Customer Details" open={open} onCancel={onClose} footer={<Button variant="outline" onClick={onClose}>Close</Button>} destroyOnClose width={600}>
      <div className="space-y-6 pt-4">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600">{(user.full_name || user.email || "U").charAt(0).toUpperCase()}</div>
          <div className="flex-1"><h3 className="text-lg font-semibold text-ink">{user.full_name || "No name"}</h3><p className="text-sm text-muted">{user.email}</p>{user.phone && <p className="text-sm text-muted">{user.phone}</p>}</div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-surface/60 p-4 text-center"><p className="text-2xl font-bold text-ink">{bookings.length}</p><p className="text-xs text-muted">Total Bookings</p></div>
          <div className="rounded-xl border border-border bg-surface/60 p-4 text-center"><p className="text-2xl font-bold text-ink">{upcomingBookings.length}</p><p className="text-xs text-muted">Upcoming</p></div>
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-center"><p className="text-2xl font-bold text-brand-700">{formatPrice(totalSpent)}</p><p className="text-xs text-muted">Total Spent</p></div>
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-surface/60 p-4">
          <h4 className="font-medium text-ink">Account Information</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Role</span><span className="font-medium text-ink capitalize">{user.user_type || "customer"}</span></div>
            <div className="flex justify-between"><span className="text-muted">User ID</span><span className="font-mono text-xs text-ink">{user.id}</span></div>
            {user.created_at && <div className="flex justify-between"><span className="text-muted">Joined</span><span className="text-ink">{new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span></div>}
          </div>
        </div>
        {bookings.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-ink">Recent Bookings</h4>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {bookings.slice(0, 5).map((booking) => {
                const isPast = new Date(booking.booking_date) < new Date(new Date().toDateString());
                return (
                  <div key={booking.id} className="flex items-center justify-between rounded-lg border border-border bg-panel p-3">
                    <div><p className="text-sm font-medium text-ink">{booking.room?.title || "Room"}</p><p className="text-xs text-muted">{new Date(booking.booking_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p></div>
                    <div className="text-right"><p className="text-sm font-medium text-ink">{formatPrice(booking.total_price || 0)}</p><span className={`text-xs ${isPast ? "text-slate-500" : "text-green-600"}`}>{isPast ? "Completed" : "Upcoming"}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
});

const EditUserModal = React.memo(({ open, user, onClose, onSave }) => {
  const dispatch = useDispatch();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (user && open) { setFullName(user.full_name || ""); setPhone(user.phone || ""); setError(""); } }, [user, open]);

  const handleSave = useCallback(async () => {
    setError(""); setSaving(true);
    try { await dispatch(updateUser({ id: user.id, full_name: fullName.trim() || null, phone: phone.trim() || null })).unwrap(); onSave(); }
    catch (err) { setError(err || "Failed to update customer."); }
    finally { setSaving(false); }
  }, [dispatch, fullName, onSave, phone, user?.id]);

  return (
    <Modal title="Edit Customer" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-600">{(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}</div>
          <div><p className="font-medium text-ink">{user?.email}</p><p className="text-xs text-muted">User ID: {user?.id?.slice(0, 8)}...</p></div>
        </div>
        <FormInput label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter full name" />
        <FormInput label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button></div>
      </div>
    </Modal>
  );
});

const DeleteUserModal = React.memo(({ open, user, onClose, onConfirm }) => {
  const dispatch = useDispatch();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = useCallback(async () => {
    setError(""); setDeleting(true);
    try { await dispatch(deleteUser(user.id)).unwrap(); onConfirm(); }
    catch (err) { setError(err || "Failed to delete customer profile."); }
    finally { setDeleting(false); }
  }, [dispatch, user?.id, onConfirm]);

  return (
    <Modal title="Delete Customer Profile" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted">Are you sure you want to delete this customer's profile?</p>
        {user && (<div className="rounded-xl border border-red-100 bg-red-50 p-4"><p className="font-medium text-ink">{user.full_name || "No name"}</p><p className="text-sm text-muted">{user.email}</p></div>)}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button className="!bg-red-600 hover:!bg-red-700" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete Profile"}</Button></div>
      </div>
    </Modal>
  );
});

export default function AdminUsers() {
  const dispatch = useDispatch();
  const { users, loading } = useSelector((state) => state.users);
  const { bookings } = useSelector((state) => state.bookings);
  const { rooms: roomsList } = useSelector((state) => state.rooms);

  const [searchTerm, setSearchTerm] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all"); // "all" | owner_id
  const [owners, setOwners] = useState([]);
  const [viewingUser, setViewingUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  useEffect(() => {
    dispatch(fetchUsers({ role: "customer" }));
    dispatch(fetchBookings({ limit: 1000 }));
    dispatch(fetchRooms());
    api.get("/admin/owners", { params: { limit: 200 } })
      .then(({ data }) => setOwners(data.owners || []))
      .catch(() => {});
  }, [dispatch]);

  // Map of room_id -> room (to look up owner_id)
  const roomsMap = useMemo(() => {
    const m = {};
    (roomsList || []).forEach((r) => { m[r.id] = r; });
    return m;
  }, [roomsList]);

  const userBookingsMap = useMemo(() => {
    const map = {};
    (bookings || []).forEach((booking) => { if (!map[booking.user_id]) map[booking.user_id] = []; map[booking.user_id].push(booking); });
    return map;
  }, [bookings]);

  // When an owner is selected, only show customers who booked on that owner's rooms
  const ownerCustomerIds = useMemo(() => {
    if (ownerFilter === "all") return null; // null = no filter

    // Get room IDs owned by the selected owner
    const ownerRoomIds = new Set(
      (roomsList || []).filter((r) => r.owner_id === ownerFilter).map((r) => r.id)
    );

    // Get user IDs who have bookings on those rooms
    const customerIds = new Set();
    (bookings || []).forEach((b) => {
      if (ownerRoomIds.has(b.room_id) && b.user_id) {
        customerIds.add(b.user_id);
      }
    });

    return customerIds;
  }, [ownerFilter, roomsList, bookings]);

  // Filter to only show customers (not owners or admins)
  const filteredUsers = useMemo(() => {
    return (users || []).filter((user) => {
      // Only show customers
      if (user.user_type && user.user_type !== "customer") return false;

      // Owner filter: only show customers who booked on selected owner's rooms
      if (ownerCustomerIds !== null && !ownerCustomerIds.has(user.id)) return false;

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (
          !user.full_name?.toLowerCase().includes(search) &&
          !user.email?.toLowerCase().includes(search) &&
          !user.phone?.includes(search)
        ) return false;
      }
      return true;
    });
  }, [users, searchTerm, ownerCustomerIds]);

  const handleEditSave = useCallback(() => { setEditingUser(null); dispatch(fetchUsers({ role: "customer" })); }, [dispatch]);
  const handleDeleteConfirm = useCallback(() => { setDeletingUser(null); }, []);

  if (loading) {
    return (<div className="flex h-64 items-center justify-center"><div className="text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /><p className="mt-4 text-sm text-muted">Loading customers...</p></div></div>);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle={`Manage customer profiles (${filteredUsers.length} shown)`}
      />

      {/* Owner Picker */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted whitespace-nowrap">Filter by owner:</label>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className={`${INPUT_STYLES} min-w-[200px]`}
        >
          <option value="all">All Customers</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.full_name || owner.email || "Unknown Owner"}
            </option>
          ))}
        </select>
      </div>

      <SearchField value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, email, or phone..." className="max-w-md" />

      {filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel py-12 text-center shadow-sm"><p className="mt-4 text-sm font-medium text-ink">No customers found</p><p className="mt-1 text-sm text-muted">{searchTerm || ownerFilter !== "all" ? "Try adjusting your filters" : "Customers will appear here when they sign up"}</p></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => {
            const userBookings = userBookingsMap[user.id] || [];
            const totalSpent = userBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
            return (
              <div key={user.id} className="rounded-2xl border border-border bg-panel p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-600">{(user.full_name || user.email || "U").charAt(0).toUpperCase()}</div>
                    <div><p className="font-semibold text-ink">{user.full_name || "No name"}</p><p className="text-sm text-muted">{user.email}</p></div>
                  </div>
                  <span className="rounded-full bg-surface/60 px-2 py-0.5 text-xs font-medium text-ink">Customer</span>
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div><span className="text-muted">Bookings: </span><span className="font-medium text-ink">{userBookings.length}</span></div>
                  <div><span className="text-muted">Spent: </span><span className="font-medium text-brand-600">{formatPrice(totalSpent)}</span></div>
                </div>
                {user.phone && <p className="mt-2 text-sm text-muted">{user.phone}</p>}
                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  <button onClick={() => setViewingUser(user)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600">View</button>
                  <button onClick={() => setEditingUser(user)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">Edit</button>
                  <button onClick={() => setDeletingUser(user)} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ViewUserModal open={!!viewingUser} user={viewingUser} bookings={viewingUser ? userBookingsMap[viewingUser.id] || [] : []} onClose={() => setViewingUser(null)} />
      <EditUserModal open={!!editingUser} user={editingUser} onClose={() => setEditingUser(null)} onSave={handleEditSave} />
      <DeleteUserModal open={!!deletingUser} user={deletingUser} onClose={() => setDeletingUser(null)} onConfirm={handleDeleteConfirm} />
    </div>
  );
}
