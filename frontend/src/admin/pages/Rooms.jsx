import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../auth/useAuth.js";
import { formatPrice } from "../../guest/utils/format.js";
import Button from "../../guest/components/ui/Button.jsx";
import { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import { fetchRooms, deleteRoom } from "../../redux/slices/roomSlice.js";
import { fetchBookings } from "../../redux/slices/bookingSlice.js";
import api from "../../redux/api.js";
import { ROOM_TYPES } from "../../guest/utils/constants.js";

const DeleteRoomModal = React.memo(({ open, room, onClose, onConfirm }) => {
  const dispatch = useDispatch();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = useCallback(async () => {
    setError("");
    setDeleting(true);

    try {
      await dispatch(deleteRoom(room.id)).unwrap();
      onConfirm();
    } catch (err) {
      setError(err || "Failed to delete room.");
    } finally {
      setDeleting(false);
    }
  }, [dispatch, onConfirm, room?.id]);

  return (
    <Modal title="Delete Room" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted dark:text-dark-muted">
          Are you sure you want to delete this room? This action cannot be undone.
        </p>
        {room && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              {room.image && <img src={room.image} alt={room.title} className="h-12 w-12 rounded-xl object-cover" />}
              <div>
                <p className="font-medium text-ink dark:text-dark-ink">{room.title}</p>
                <p className="text-sm text-muted dark:text-dark-muted">{room.location}</p>
              </div>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="!bg-red-600 hover:!bg-red-700" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete Room"}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

function RoomCardBadges({ room }) {
  const badges = [];
  if (room.is_guest_favorite) badges.push({ label: "Guest Favorite", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700" });
  if (room.is_luxe) badges.push({ label: "Luxe", cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700" });
  if (room.instant_book) badges.push({ label: "Instant Book", cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700" });
  if (badges.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {badges.map((badge) => (
        <span key={badge.label} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}

export default function AdminRooms() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { rooms, loading } = useSelector((state) => state.rooms);
  const { bookings } = useSelector((state) => state.bookings);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("admin");
  const [owners, setOwners] = useState([]);
  const [deletingRoom, setDeletingRoom] = useState(null);

  useEffect(() => {
    dispatch(fetchRooms());
    dispatch(fetchBookings({ limit: 1000 }));
    api
      .get("/admin/owners", { params: { limit: 200 } })
      .then(({ data }) => setOwners(data.owners || []))
      .catch(() => {});
  }, [dispatch]);

  const roomBookingsCount = useMemo(() => {
    const counts = {};
    (bookings || []).forEach((booking) => {
      counts[booking.room_id] = (counts[booking.room_id] || 0) + 1;
    });
    return counts;
  }, [bookings]);

  const filteredRooms = useMemo(() => {
    return (rooms || []).filter((room) => {
      if (ownerFilter !== "all") {
        if (ownerFilter === "admin") {
          if (room.owner_id && room.owner_id !== user?.id) return false;
        } else if (room.owner_id !== ownerFilter) {
          return false;
        }
      }

      if (typeFilter !== "all" && room.type !== typeFilter) return false;

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!room.title?.toLowerCase().includes(search) && !room.location?.toLowerCase().includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [ownerFilter, rooms, searchTerm, typeFilter, user?.id]);

  const handleDeleteConfirm = useCallback(() => {
    setDeletingRoom(null);
  }, []);

  if (loading && !(rooms || []).length) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted dark:text-dark-muted">Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-border bg-gradient-to-br from-panel via-panel to-brand-50/60 p-6 shadow-sm dark:border-dark-border dark:from-dark-panel dark:via-dark-panel dark:to-brand-900/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink dark:text-dark-ink">Rooms</h1>
            <p className="mt-2 text-sm text-muted dark:text-dark-muted">
              Manage listings with a full-page editor for richer room details and gallery management.
            </p>
          </div>
          <Button onClick={() => navigate("/admin/rooms/new")}>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
            </svg>
            Add Room
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_200px]">
        <div>
          <label className="mb-2 block text-sm font-medium text-muted dark:text-dark-muted">Filter by owner</label>
          <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} className={`${INPUT_STYLES} w-full`}>
            <option value="admin">My Rooms (Admin)</option>
            <option value="all">All Rooms</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.full_name || owner.email || "Unknown Owner"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-muted dark:text-dark-muted">Search</label>
          <input
            type="text"
            placeholder="Search by title or location..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className={`${INPUT_STYLES} w-full`}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-muted dark:text-dark-muted">Room type</label>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={`${INPUT_STYLES} w-full`}>
            <option value="all">All types</option>
            {ROOM_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="rounded-3xl border border-border bg-panel py-14 text-center shadow-sm dark:border-dark-border dark:bg-dark-panel">
          <p className="text-sm font-medium text-ink dark:text-dark-ink">No rooms found</p>
          <p className="mt-2 text-sm text-muted dark:text-dark-muted">
            {searchTerm || typeFilter !== "all" || ownerFilter !== "admin"
              ? "Try adjusting your filters."
              : "Add your first room to get started."}
          </p>
          {!searchTerm && typeFilter === "all" && ownerFilter === "admin" && (
            <div className="mt-5">
              <Button onClick={() => navigate("/admin/rooms/new")}>Add Room</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRooms.map((room) => {
            const bookingsCount = roomBookingsCount[room.id] || 0;

            return (
              <div
                key={room.id}
                className="overflow-hidden rounded-3xl border border-border bg-panel shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-dark-border dark:bg-dark-panel"
              >
                {room.image ? (
                  <img src={room.image} alt={room.title} className="h-44 w-full object-cover" />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-gradient-to-br from-brand-50 to-surface text-sm text-muted dark:from-brand-900/20 dark:to-dark-surface dark:text-dark-muted">
                    No cover image
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-ink dark:text-dark-ink">{room.title}</h3>
                      <p className="text-sm text-muted dark:text-dark-muted">{room.location}</p>
                    </div>
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium capitalize text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                      {room.type}
                    </span>
                  </div>

                  <RoomCardBadges room={room} />

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted dark:text-dark-muted">
                    <span>{room.guests} guests</span>
                    <span>{room.bedrooms ?? 1} bd</span>
                    <span>{room.beds ?? 1} beds</span>
                    <span>{room.bathrooms ?? 1} ba</span>
                    <span>{bookingsCount} bookings</span>
                  </div>

                  {room.amenities?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {room.amenities.slice(0, 3).map((amenity) => (
                        <span
                          key={amenity}
                          className="rounded-full bg-surface/80 px-2 py-0.5 text-[10px] text-muted dark:bg-dark-surface/70 dark:text-dark-muted"
                        >
                          {amenity.replace(/_/g, " ")}
                        </span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="text-[10px] text-muted dark:text-dark-muted">
                          +{room.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                        {formatPrice(room.price_per_day || 0)}
                      </span>
                      <span className="text-sm text-muted dark:text-dark-muted">/day</span>
                    </div>
                    <span className="text-xs text-muted dark:text-dark-muted">
                      {(room.images?.length || 0) + (room.image ? 1 : 0)} photos
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-border pt-4 dark:border-dark-border">
                    <button
                      onClick={() => navigate(`/admin/rooms/${room.id}`)}
                      className="flex-1 rounded-full border border-border px-3 py-2 text-sm font-medium text-muted transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-dark-border dark:text-dark-muted dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
                    >
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/admin/rooms/${room.id}/edit`)}
                      className="flex-1 rounded-full border border-border px-3 py-2 text-sm font-medium text-muted transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-dark-border dark:text-dark-muted dark:hover:border-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingRoom(room)}
                      className="rounded-full border border-border px-3 py-2 text-sm font-medium text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-dark-border dark:text-dark-muted dark:hover:border-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <DeleteRoomModal
        open={!!deletingRoom}
        room={deletingRoom}
        onClose={() => setDeletingRoom(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
