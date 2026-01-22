import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import { supabase } from "../../lib/supabaseClient.js";
import { formatPrice } from "../../guest/utils/format.js";
import Button from "../../guest/components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";

const ROOM_TYPES = [
  { value: "room", label: "Room" },
  { value: "suite", label: "Suite" },
  { value: "studio", label: "Studio" },
  { value: "villa", label: "Villa" },
  { value: "resort", label: "Resort" },
];

const ViewRoomModal = React.memo(({ open, room, bookingsCount, onClose }) => {
  if (!room) return null;

  return (
    <Modal
      title="Room Details"
      open={open}
      onCancel={onClose}
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
      destroyOnClose
      width={600}
    >
      <div className="space-y-6 pt-4">
        {/* Room Image */}
        {room.image && (
          <img
            src={room.image}
            alt={room.title}
            className="h-48 w-full rounded-xl object-cover"
          />
        )}

        {/* Room Info */}
        <div>
          <h3 className="text-xl font-semibold text-ink">{room.title}</h3>
          <p className="mt-1 text-sm text-muted">{room.location}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-ink">{room.guests || 0}</p>
            <p className="text-xs text-muted">Max Guests</p>
          </div>
          <div className="rounded-xl border border-border bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-ink">{bookingsCount}</p>
            <p className="text-xs text-muted">Total Bookings</p>
          </div>
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-center">
            <p className="text-2xl font-bold text-brand-700">
              {formatPrice(room.price_per_hour || 0)}
            </p>
            <p className="text-xs text-muted">Per Hour</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 rounded-xl border border-border bg-slate-50 p-4">
          <h4 className="font-medium text-ink">Room Information</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Type</span>
              <span className="capitalize text-ink">{room.type || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Room ID</span>
              <span className="font-mono text-xs text-ink">{room.id}</span>
            </div>
            {room.created_at && (
              <div className="flex justify-between">
                <span className="text-muted">Created</span>
                <span className="text-ink">
                  {new Date(room.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {room.tags && room.tags.length > 0 && (
          <div>
            <h4 className="mb-2 font-medium text-ink">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {room.tags.map((tag, index) => (
                <span
                  key={index}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
});

const RoomFormModal = React.memo(({ open, room, onClose, onSave, isNew }) => {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("room");
  const [guests, setGuests] = useState(2);
  const [pricePerHour, setPricePerHour] = useState(25);
  const [image, setImage] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (room && !isNew) {
        setTitle(room.title || "");
        setLocation(room.location || "");
        setType(room.type || "room");
        setGuests(room.guests || 2);
        setPricePerHour(room.price_per_hour || 25);
        setImage(room.image || "");
        setTags(room.tags?.join(", ") || "");
      } else {
        setTitle("");
        setLocation("");
        setType("room");
        setGuests(2);
        setPricePerHour(25);
        setImage("");
        setTags("");
      }
      setError("");
    }
  }, [room, open, isNew]);

  const handleSave = useCallback(async () => {
    setError("");

    if (!title.trim()) {
      setError("Please enter a room title.");
      return;
    }

    if (!location.trim()) {
      setError("Please enter a location.");
      return;
    }

    setSaving(true);

    const roomData = {
      title: title.trim(),
      location: location.trim(),
      type,
      guests: Number(guests) || 2,
      price_per_hour: Number(pricePerHour) || 0,
      image: image.trim() || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    let result;
    if (isNew) {
      // Generate UUID for new rooms
      roomData.id = crypto.randomUUID();
      result = await supabase.from("rooms").insert([roomData]).select().single();
    } else {
      result = await supabase
        .from("rooms")
        .update(roomData)
        .eq("id", room.id)
        .select()
        .single();
    }

    setSaving(false);

    if (result.error) {
      setError(result.error.message || `Failed to ${isNew ? "create" : "update"} room.`);
      return;
    }

    onSave();
  }, [title, location, type, guests, pricePerHour, image, tags, isNew, room?.id, onSave]);

  return (
    <Modal
      title={isNew ? "Add New Room" : "Edit Room"}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={600}
    >
      <div className="space-y-4 pt-4">
        <FormInput
          label="Room Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Seaside Premium Suite"
        />

        <FormInput
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Washington"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Room Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={INPUT_STYLES}
            >
              {ROOM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <FormInput
            label="Max Guests"
            type="number"
            min={1}
            max={20}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
          />
        </div>

        <FormInput
          label="Price per Hour ($)"
          type="number"
          min={0}
          step={0.01}
          value={pricePerHour}
          onChange={(e) => setPricePerHour(e.target.value)}
        />

        <FormInput
          label="Image URL"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="https://example.com/image.jpg"
        />

        {image && (
          <div className="overflow-hidden rounded-xl border border-border">
            <img
              src={image}
              alt="Preview"
              className="h-32 w-full object-cover"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        )}

        <FormInput
          label="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., Ocean view, Wi-Fi, Workspace"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Create Room" : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

const DeleteRoomModal = React.memo(({ open, room, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = useCallback(async () => {
    setError("");
    setDeleting(true);

    const { error: deleteError } = await supabase
      .from("rooms")
      .delete()
      .eq("id", room.id);

    setDeleting(false);

    if (deleteError) {
      setError(deleteError.message || "Failed to delete room.");
      return;
    }

    onConfirm();
  }, [room?.id, onConfirm]);

  return (
    <Modal
      title="Delete Room"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted">
          Are you sure you want to delete this room? This action cannot be undone and will affect any associated bookings.
        </p>

        {room && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-center gap-3">
              {room.image && (
                <img
                  src={room.image}
                  alt={room.title}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="font-medium text-ink">{room.title}</p>
                <p className="text-sm text-muted">{room.location}</p>
              </div>
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
            {deleting ? "Deleting..." : "Delete Room"}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [viewingRoom, setViewingRoom] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);

    const { data: roomsData, error: roomsError } = await supabase
      .from("rooms")
      .select("*")
      .order("created_at", { ascending: false });

    if (roomsError) {
      console.error("Error fetching rooms:", roomsError);
    }

    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("room_id");

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
    }

    setRooms(roomsData || []);
    setBookings(bookingsData || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const roomBookingsCount = useMemo(() => {
    const counts = {};
    bookings.forEach((b) => {
      counts[b.room_id] = (counts[b.room_id] || 0) + 1;
    });
    return counts;
  }, [bookings]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Type filter
      if (typeFilter !== "all" && room.type !== typeFilter) return false;

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesTitle = room.title?.toLowerCase().includes(search);
        const matchesLocation = room.location?.toLowerCase().includes(search);
        if (!matchesTitle && !matchesLocation) return false;
      }

      return true;
    });
  }, [rooms, searchTerm, typeFilter]);

  const handleSave = useCallback(() => {
    setEditingRoom(null);
    setIsCreating(false);
    fetchRooms();
  }, [fetchRooms]);

  const handleDeleteConfirm = useCallback(() => {
    setDeletingRoom(null);
    fetchRooms();
  }, [fetchRooms]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Rooms</h1>
          <p className="mt-1 text-sm text-muted">
            Manage your property listings ({rooms.length} total)
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Room
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by title or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${INPUT_STYLES} w-full`}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={INPUT_STYLES}
        >
          <option value="all">All Types</option>
          {ROOM_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white py-12 text-center shadow-sm">
          <svg className="mx-auto h-12 w-12 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="mt-4 text-sm font-medium text-ink">No rooms found</p>
          <p className="mt-1 text-sm text-muted">
            {searchTerm || typeFilter !== "all"
              ? "Try adjusting your filters"
              : "Add your first room to get started"}
          </p>
          {!searchTerm && typeFilter === "all" && (
            <div className="mt-4">
              <Button onClick={() => setIsCreating(true)}>Add Room</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => {
            const bookingsCount = roomBookingsCount[room.id] || 0;

            return (
              <div
                key={room.id}
                className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {room.image && (
                  <img
                    src={room.image}
                    alt={room.title}
                    className="h-40 w-full object-cover"
                  />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-ink">{room.title}</h3>
                      <p className="text-sm text-muted">{room.location}</p>
                    </div>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium capitalize text-brand-700">
                      {room.type}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {room.guests} guests
                    </div>
                    <div className="flex items-center gap-1 text-muted">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {bookingsCount} bookings
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-lg font-bold text-brand-600">
                      {formatPrice(room.price_per_hour || 0)}
                    </span>
                    <span className="text-sm text-muted">/hr</span>
                  </div>

                  {room.tags && room.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {room.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                      {room.tags.length > 3 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-muted">
                          +{room.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2 border-t border-border pt-4">
                    <button
                      onClick={() => setViewingRoom(room)}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
                    >
                      View
                    </button>
                    <button
                      onClick={() => setEditingRoom(room)}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingRoom(room)}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
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

      {/* Modals */}
      <ViewRoomModal
        open={!!viewingRoom}
        room={viewingRoom}
        bookingsCount={viewingRoom ? roomBookingsCount[viewingRoom.id] || 0 : 0}
        onClose={() => setViewingRoom(null)}
      />

      <RoomFormModal
        open={!!editingRoom || isCreating}
        room={editingRoom}
        isNew={isCreating}
        onClose={() => {
          setEditingRoom(null);
          setIsCreating(false);
        }}
        onSave={handleSave}
      />

      <DeleteRoomModal
        open={!!deletingRoom}
        room={deletingRoom}
        onClose={() => setDeletingRoom(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
