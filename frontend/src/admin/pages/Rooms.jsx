import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../auth/useAuth.js";
import { formatPrice } from "../../guest/utils/format.js";
import Button from "../../guest/components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import { fetchRooms, createRoom, updateRoom, deleteRoom } from "../../redux/slices/roomSlice.js";
import { fetchBookings } from "../../redux/slices/bookingSlice.js";
import api from "../../redux/api.js";
import {
  AMENITIES,
  PROPERTY_TYPES,
  PLACE_TYPES,
  BOOKING_OPTIONS,
  STANDOUT_STAYS,
  toLabel,
} from "../../guest/utils/roomFilters.js";

const ROOM_TYPES = [
  { value: "room", label: "Room" },
  { value: "suite", label: "Suite" },
  { value: "studio", label: "Studio" },
  { value: "villa", label: "Villa" },
  { value: "resort", label: "Resort" },
];

const AMENITY_GROUPS = [
  { key: "popular", label: "Popular" },
  { key: "essentials", label: "Essentials" },
  { key: "features", label: "Features" },
  { key: "safety", label: "Safety" },
];

const ViewRoomModal = React.memo(({ open, room, bookingsCount, onClose }) => {
  if (!room) return null;
  return (
    <Modal title="Room Details" open={open} onCancel={onClose} footer={<Button variant="outline" onClick={onClose}>Close</Button>} destroyOnClose width={600}>
      <div className="space-y-6 pt-4">
        {room.image && <img src={room.image} alt={room.title} className="h-48 w-full rounded-xl object-cover" />}
        <div><h3 className="text-xl font-semibold text-ink">{room.title}</h3><p className="mt-1 text-sm text-muted">{room.location}</p></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-surface/60 p-4 text-center"><p className="text-2xl font-bold text-ink">{room.guests || 0}</p><p className="text-xs text-muted">Max Guests</p></div>
          <div className="rounded-xl border border-border bg-surface/60 p-4 text-center"><p className="text-2xl font-bold text-ink">{bookingsCount}</p><p className="text-xs text-muted">Total Bookings</p></div>
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-center"><p className="text-2xl font-bold text-brand-700">{formatPrice(room.price_per_day || 0)}</p><p className="text-xs text-muted">Per Day</p></div>
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-surface/60 p-4">
          <h4 className="font-medium text-ink">Room Information</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Type</span><span className="capitalize text-ink">{room.type || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Room ID</span><span className="font-mono text-xs text-ink">{room.id}</span></div>
          </div>
        </div>
        {room.tags?.length > 0 && (<div><h4 className="mb-2 font-medium text-ink">Tags</h4><div className="flex flex-wrap gap-2">{room.tags.map((tag, i) => (<span key={i} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">{tag}</span>))}</div></div>)}
      </div>
    </Modal>
  );
});

const RoomFormModal = React.memo(({ open, room, onClose, onSave, isNew }) => {
  const dispatch = useDispatch();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("room");
  const [guests, setGuests] = useState(2);
  const [pricePerDay, setPricePerDay] = useState(100);
  const [image, setImage] = useState("");
  const [tags, setTags] = useState("");
  const [propertyType, setPropertyType] = useState(PROPERTY_TYPES[0]);
  const [placeType, setPlaceType] = useState("room");
  const [bedrooms, setBedrooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [instantBook, setInstantBook] = useState(false);
  const [selfCheckin, setSelfCheckin] = useState(false);
  const [allowsPets, setAllowsPets] = useState(false);
  const [isGuestFavorite, setIsGuestFavorite] = useState(false);
  const [isLuxe, setIsLuxe] = useState(false);
  const [amenities, setAmenities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleAmenity = useCallback((amenity) => {
    setAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((item) => item !== amenity)
        : [...prev, amenity]
    );
  }, []);

  useEffect(() => {
    if (open) {
      if (room && !isNew) {
        setTitle(room.title || "");
        setLocation(room.location || "");
        setType(room.type || "room");
        setGuests(room.guests || 2);
        setPricePerDay(room.price_per_day || 100);
        setImage(room.image || "");
        setTags(room.tags?.join(", ") || "");
        setPropertyType(room.property_type || PROPERTY_TYPES[0]);
        setPlaceType(room.place_type || "room");
        setBedrooms(room.bedrooms ?? 1);
        setBeds(room.beds ?? 1);
        setBathrooms(room.bathrooms ?? 1);
        setInstantBook(Boolean(room.instant_book));
        setSelfCheckin(Boolean(room.self_checkin));
        setAllowsPets(Boolean(room.allows_pets));
        setIsGuestFavorite(Boolean(room.is_guest_favorite));
        setIsLuxe(Boolean(room.is_luxe));
        setAmenities(Array.isArray(room.amenities) ? room.amenities : []);
      } else {
        setTitle("");
        setLocation("");
        setType("room");
        setGuests(2);
        setPricePerDay(100);
        setImage("");
        setTags("");
        setPropertyType(PROPERTY_TYPES[0]);
        setPlaceType("room");
        setBedrooms(1);
        setBeds(1);
        setBathrooms(1);
        setInstantBook(false);
        setSelfCheckin(false);
        setAllowsPets(false);
        setIsGuestFavorite(false);
        setIsLuxe(false);
        setAmenities([]);
      }
      setError("");
    }
  }, [room, open, isNew]);

  const handleSave = useCallback(async () => {
    setError("");
    if (!title.trim()) { setError("Please enter a room title."); return; }
    if (!location.trim()) { setError("Please enter a location."); return; }
    if (!propertyType) { setError("Please select a property type."); return; }
    if (!placeType || placeType === "any") { setError("Please select a valid place type."); return; }
    if (!amenities.length) { setError("Select at least one amenity."); return; }
    setSaving(true);
    const safetyFeatures = amenities.filter((amenity) => AMENITIES.safety.includes(amenity));
    const roomData = {
      title: title.trim(),
      location: location.trim(),
      type,
      guests: Number(guests) || 2,
      price_per_day: Number(pricePerDay) || 0,
      image: image.trim() || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      property_type: propertyType,
      place_type: placeType,
      bedrooms: Number(bedrooms) || 0,
      beds: Number(beds) || 0,
      bathrooms: Number(bathrooms) || 0,
      instant_book: instantBook,
      self_checkin: selfCheckin,
      allows_pets: allowsPets,
      is_guest_favorite: isGuestFavorite,
      is_luxe: isLuxe,
      amenities,
      safety_features: safetyFeatures,
    };
    try {
      if (isNew) { await dispatch(createRoom(roomData)).unwrap(); }
      else { await dispatch(updateRoom({ id: room.id, ...roomData })).unwrap(); }
      onSave();
    } catch (err) { setError(err || `Failed to ${isNew ? "create" : "update"} room.`); }
    finally { setSaving(false); }
  }, [dispatch, title, location, type, guests, pricePerDay, image, tags, propertyType, placeType, bedrooms, beds, bathrooms, instantBook, selfCheckin, allowsPets, isGuestFavorite, isLuxe, amenities, isNew, room?.id, onSave]);

  return (
    <Modal title={isNew ? "Add New Room" : "Edit Room"} open={open} onCancel={onClose} footer={null} destroyOnClose width={600}>
      <div className="space-y-4 pt-4">
        <FormInput label="Room Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Seaside Premium Suite" />
        <FormInput label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Washington" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2"><span className="text-sm font-medium text-muted">Room Type</span><select value={type} onChange={(e) => setType(e.target.value)} className={INPUT_STYLES}>{ROOM_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}</select></label>
          <FormInput label="Max Guests" type="number" min={1} max={20} value={guests} onChange={(e) => setGuests(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Property Type *</span>
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={INPUT_STYLES}>
              {PROPERTY_TYPES.map((item) => (<option key={item} value={item}>{toLabel(item)}</option>))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Place Type *</span>
            <select value={placeType} onChange={(e) => setPlaceType(e.target.value)} className={INPUT_STYLES}>
              {PLACE_TYPES.filter((item) => item !== "any").map((item) => (<option key={item} value={item}>{toLabel(item)}</option>))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormInput label="Bedrooms" type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
          <FormInput label="Beds" type="number" min={0} value={beds} onChange={(e) => setBeds(e.target.value)} />
          <FormInput label="Bathrooms" type="number" min={0} step={0.5} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
        </div>
        <FormInput label="Price per Day ($)" type="number" min={0} step={0.01} value={pricePerDay} onChange={(e) => setPricePerDay(e.target.value)} />
        <FormInput label="Image URL" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://example.com/image.jpg" />
        {image && (<div className="overflow-hidden rounded-xl border border-border"><img src={image} alt="Preview" className="h-32 w-full object-cover" onError={(e) => { e.target.style.display = "none"; }} /></div>)}
        <FormInput label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., Ocean view, Wi-Fi, Workspace" />
        <div className="grid gap-2 sm:grid-cols-2">
          {BOOKING_OPTIONS.map((field) => (
            <label key={field} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={field === "instant_book" ? instantBook : field === "self_checkin" ? selfCheckin : allowsPets}
                onChange={(e) => {
                  if (field === "instant_book") setInstantBook(e.target.checked);
                  if (field === "self_checkin") setSelfCheckin(e.target.checked);
                  if (field === "allows_pets") setAllowsPets(e.target.checked);
                }}
              />
              {toLabel(field)}
            </label>
          ))}
          {STANDOUT_STAYS.map((field) => (
            <label key={field} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={field === "is_guest_favorite" ? isGuestFavorite : isLuxe}
                onChange={(e) => {
                  if (field === "is_guest_favorite") setIsGuestFavorite(e.target.checked);
                  if (field === "is_luxe") setIsLuxe(e.target.checked);
                }}
              />
              {toLabel(field)}
            </label>
          ))}
        </div>
        <div className="space-y-3 rounded-xl border border-border p-3">
          <p className="text-sm font-medium text-ink">Amenities *</p>
          {AMENITY_GROUPS.map((group) => (
            <div key={group.key} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {AMENITIES[group.key].map((amenity) => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      amenities.includes(amenity)
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-border bg-surface/60 text-muted"
                    }`}
                  >
                    {toLabel(amenity)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : isNew ? "Create Room" : "Save Changes"}</Button></div>
      </div>
    </Modal>
  );
});

const DeleteRoomModal = React.memo(({ open, room, onClose, onConfirm }) => {
  const dispatch = useDispatch();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = useCallback(async () => {
    setError(""); setDeleting(true);
    try { await dispatch(deleteRoom(room.id)).unwrap(); onConfirm(); }
    catch (err) { setError(err || "Failed to delete room."); }
    finally { setDeleting(false); }
  }, [dispatch, room?.id, onConfirm]);

  return (
    <Modal title="Delete Room" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted">Are you sure you want to delete this room? This action cannot be undone.</p>
        {room && (<div className="rounded-xl border border-red-100 bg-red-50 p-4"><div className="flex items-center gap-3">{room.image && <img src={room.image} alt={room.title} className="h-12 w-12 rounded-lg object-cover" />}<div><p className="font-medium text-ink">{room.title}</p><p className="text-sm text-muted">{room.location}</p></div></div></div>)}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button className="!bg-red-600 hover:!bg-red-700" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete Room"}</Button></div>
      </div>
    </Modal>
  );
});

export default function AdminRooms() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { rooms, loading } = useSelector((state) => state.rooms);
  const { bookings } = useSelector((state) => state.bookings);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("admin"); // "admin" | "all" | owner_id
  const [owners, setOwners] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const [viewingRoom, setViewingRoom] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    dispatch(fetchRooms());
    dispatch(fetchBookings({ limit: 1000 }));
    api.get("/admin/owners", { params: { limit: 200 } })
      .then(({ data }) => setOwners(data.owners || []))
      .catch(() => {});
  }, [dispatch]);

  const roomBookingsCount = useMemo(() => {
    const counts = {};
    (bookings || []).forEach((b) => { counts[b.room_id] = (counts[b.room_id] || 0) + 1; });
    return counts;
  }, [bookings]);

  const filteredRooms = useMemo(() => {
    return (rooms || []).filter((room) => {
      // Owner filter
      if (ownerFilter !== "all") {
        if (ownerFilter === "admin") {
          if (room.owner_id && room.owner_id !== user?.id) return false;
        } else {
          if (room.owner_id !== ownerFilter) return false;
        }
      }
      if (typeFilter !== "all" && room.type !== typeFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!room.title?.toLowerCase().includes(search) && !room.location?.toLowerCase().includes(search)) return false;
      }
      return true;
    });
  }, [rooms, searchTerm, typeFilter, ownerFilter, user?.id]);

  const handleSave = useCallback(() => { setEditingRoom(null); setIsCreating(false); dispatch(fetchRooms()); }, [dispatch]);
  const handleDeleteConfirm = useCallback(() => { setDeletingRoom(null); }, []);

  if (loading) {
    return (<div className="flex h-64 items-center justify-center"><div className="text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /><p className="mt-4 text-sm text-muted">Loading rooms...</p></div></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-ink">Rooms</h1><p className="mt-1 text-sm text-muted">Manage property listings ({filteredRooms.length} shown)</p></div>
        <div className="flex gap-3">
          <Button onClick={() => setIsCreating(true)}>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Add Room
          </Button>
        </div>
      </div>

      {/* Owner Picker */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted whitespace-nowrap">Filter by owner:</label>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className={`${INPUT_STYLES} min-w-[200px]`}
        >
          <option value="admin">My Rooms (Admin)</option>
          <option value="all">All Rooms</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.full_name || owner.email || "Unknown Owner"}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1"><input type="text" placeholder="Search by title or location..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${INPUT_STYLES} w-full`} /></div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={INPUT_STYLES}>
          <option value="all">All Types</option>
          {ROOM_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
        </select>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel py-12 text-center shadow-sm">
          <p className="mt-4 text-sm font-medium text-ink">No rooms found</p>
          <p className="mt-1 text-sm text-muted">{searchTerm || typeFilter !== "all" ? "Try adjusting your filters" : "Add your first room to get started"}</p>
          {!searchTerm && typeFilter === "all" && (<div className="mt-4"><Button onClick={() => setIsCreating(true)}>Add Room</Button></div>)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => {
            const bookingsCount = roomBookingsCount[room.id] || 0;
            return (
              <div key={room.id} className="overflow-hidden rounded-2xl border border-border bg-panel shadow-sm transition-shadow hover:shadow-md">
                {room.image && <img src={room.image} alt={room.title} className="h-40 w-full object-cover" />}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div><h3 className="font-semibold text-ink">{room.title}</h3><p className="text-sm text-muted">{room.location}</p></div>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium capitalize text-brand-700">{room.type}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>{room.guests} guests</div>
                    <div className="flex items-center gap-1 text-muted"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{bookingsCount} bookings</div>
                  </div>
                  <div className="mt-3"><span className="text-lg font-bold text-brand-600">{formatPrice(room.price_per_day || 0)}</span><span className="text-sm text-muted">/day</span></div>
                  <div className="mt-4 flex gap-2 border-t border-border pt-4">
                    <button onClick={() => setViewingRoom(room)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600">View</button>
                    <button onClick={() => setEditingRoom(room)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">Edit</button>
                    <button onClick={() => setDeletingRoom(room)} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ViewRoomModal open={!!viewingRoom} room={viewingRoom} bookingsCount={viewingRoom ? roomBookingsCount[viewingRoom.id] || 0 : 0} onClose={() => setViewingRoom(null)} />
      <RoomFormModal open={!!editingRoom || isCreating} room={editingRoom} isNew={isCreating} onClose={() => { setEditingRoom(null); setIsCreating(false); }} onSave={handleSave} />
      <DeleteRoomModal open={!!deletingRoom} room={deletingRoom} onClose={() => setDeletingRoom(null)} onConfirm={handleDeleteConfirm} />
    </div>
  );
}
