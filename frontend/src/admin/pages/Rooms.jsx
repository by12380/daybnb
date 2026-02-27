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
  ROOM_TYPES,
  PROPERTY_TYPES,
  PLACE_TYPES,
  AMENITY_GROUPS,
  SAFETY_FEATURES,
} from "../../guest/utils/constants.js";

// ─── Shared form helpers ────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h3 className="border-b border-border pb-1 text-sm font-semibold uppercase tracking-wider text-ink/60 dark:text-dark-ink/60">
      {children}
    </h3>
  );
}

function ToggleChip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
          : "border-border bg-surface/60 text-muted hover:border-brand-200 hover:text-ink dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted"
      }`}>
      {label}
    </button>
  );
}

function TriStateToggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 dark:border-dark-border">
      <span className="text-sm text-ink dark:text-dark-ink">{label}</span>
      <div className="flex gap-1">
        {[{ v: null, l: "None" }, { v: true, l: "Yes" }, { v: false, l: "No" }].map(({ v, l }) => (
          <button key={l} type="button" onClick={() => onChange(v)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
              value === v ? "bg-brand-600 text-white dark:bg-brand-500" : "bg-surface/60 text-muted hover:bg-surface dark:bg-dark-surface/60 dark:text-dark-muted"
            }`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── View Room Modal ────────────────────────────────────────

const ViewRoomModal = React.memo(({ open, room, bookingsCount, onClose }) => {
  if (!room) return null;
  const allImages = [room.image, ...(room.images || [])].filter(Boolean);
  return (
    <Modal title="Room Details" open={open} onCancel={onClose} footer={<Button variant="outline" onClick={onClose}>Close</Button>} destroyOnClose width={600}>
      <div className="space-y-6 pt-4">
        {allImages.length > 0 && (
          <div>
            <img src={allImages[0]} alt={room.title} className="h-48 w-full rounded-xl object-cover" />
            {allImages.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {allImages.slice(1).map((img, i) => <img key={i} src={img} alt="" className="h-16 w-24 shrink-0 rounded-lg border border-border object-cover" />)}
              </div>
            )}
          </div>
        )}
        <div>
          <h3 className="text-xl font-semibold text-ink">{room.title}</h3>
          <p className="mt-1 text-sm text-muted">{room.location}</p>
          {room.description && <p className="mt-2 text-sm leading-relaxed text-muted">{room.description}</p>}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-surface/60 p-4 text-center"><p className="text-2xl font-bold text-ink">{room.guests || 0}</p><p className="text-xs text-muted">Max Guests</p></div>
          <div className="rounded-xl border border-border bg-surface/60 p-4 text-center"><p className="text-2xl font-bold text-ink">{bookingsCount}</p><p className="text-xs text-muted">Total Bookings</p></div>
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-center"><p className="text-2xl font-bold text-brand-700">{formatPrice(room.price_per_day || 0)}</p><p className="text-xs text-muted">Per Day</p></div>
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-surface/60 p-4">
          <h4 className="font-medium text-ink">Room Information</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Type</span><span className="capitalize text-ink">{room.type || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Property</span><span className="capitalize text-ink">{room.property_type || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Place</span><span className="capitalize text-ink">{(room.place_type || "").replace(/_/g, " ") || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Beds / Baths</span><span className="text-ink">{room.beds ?? 1} beds, {room.bathrooms ?? 1} bath</span></div>
            <div className="flex justify-between"><span className="text-muted">Instant Book</span><span className="text-ink">{room.instant_book ? "Yes" : "No"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Pets</span><span className="text-ink">{room.allows_pets ? "Yes" : "No"}</span></div>
            <div className="flex justify-between"><span className="text-muted">Room ID</span><span className="font-mono text-xs text-ink">{room.id}</span></div>
          </div>
        </div>
        {room.amenities?.length > 0 && (<div><h4 className="mb-2 font-medium text-ink">Amenities</h4><div className="flex flex-wrap gap-2">{room.amenities.map((a) => (<span key={a} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">{a.replace(/_/g, " ")}</span>))}</div></div>)}
        {room.tags?.length > 0 && (<div><h4 className="mb-2 font-medium text-ink">Tags</h4><div className="flex flex-wrap gap-2">{room.tags.map((tag, i) => (<span key={i} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">{tag}</span>))}</div></div>)}
      </div>
    </Modal>
  );
});

// ─── Room Form Modal (full fields) ──────────────────────────

const PLACE_TYPE_OPTIONS = PLACE_TYPES.filter((p) => p.value !== "any");

const RoomFormModal = React.memo(({ open, room, onClose, onSave, isNew }) => {
  const dispatch = useDispatch();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("room");
  const [guests, setGuests] = useState(2);
  const [pricePerDay, setPricePerDay] = useState(100);
  const [image, setImage] = useState("");
  const [tags, setTags] = useState("");

  const [propertyType, setPropertyType] = useState("house");
  const [placeType, setPlaceType] = useState("entire_home");
  const [bedrooms, setBedrooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [instantBook, setInstantBook] = useState(null);
  const [selfCheckin, setSelfCheckin] = useState(null);
  const [allowsPets, setAllowsPets] = useState(null);
  const [isGuestFavorite, setIsGuestFavorite] = useState(null);
  const [isLuxe, setIsLuxe] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [safetyFeatures, setSafetyFeatures] = useState([]);
  const [images, setImages] = useState([]);
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (room && !isNew) {
        setTitle(room.title || ""); setLocation(room.location || ""); setType(room.type || "room");
        setGuests(room.guests || 2); setPricePerDay(room.price_per_day || 100);
        setImage(room.image || ""); setTags(room.tags?.join(", ") || "");
        setPropertyType(room.property_type || "house"); setPlaceType(room.place_type || "entire_home");
        setBedrooms(room.bedrooms ?? 1); setBeds(room.beds ?? 1); setBathrooms(room.bathrooms ?? 1);
        setInstantBook(room.instant_book ?? null); setSelfCheckin(room.self_checkin ?? null);
        setAllowsPets(room.allows_pets ?? null); setIsGuestFavorite(room.is_guest_favorite ?? null);
        setIsLuxe(room.is_luxe ?? null); setAmenities(room.amenities || []);
        setSafetyFeatures(room.safety_features || []);
        setImages(room.images || []); setDescription(room.description || "");
      } else {
        setTitle(""); setLocation(""); setType("room"); setGuests(2);
        setPricePerDay(100); setImage(""); setTags("");
        setPropertyType("house"); setPlaceType("entire_home");
        setBedrooms(1); setBeds(1); setBathrooms(1);
        setInstantBook(null); setSelfCheckin(null); setAllowsPets(null);
        setIsGuestFavorite(null); setIsLuxe(null);
        setAmenities([]); setSafetyFeatures([]);
        setImages([]); setDescription("");
      }
      setError("");
    }
  }, [room, open, isNew]);

  const toggleAmenity = useCallback((val) => {
    setAmenities((prev) => prev.includes(val) ? prev.filter((a) => a !== val) : [...prev, val]);
  }, []);

  const toggleSafety = useCallback((val) => {
    setSafetyFeatures((prev) => prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]);
  }, []);

  const handleSave = useCallback(async () => {
    setError("");
    if (!title.trim()) { setError("Please enter a room title."); return; }
    if (!location.trim()) { setError("Please enter a location."); return; }
    setSaving(true);
    const cleanImages = images.map((u) => u.trim()).filter(Boolean);
    const roomData = {
      title: title.trim(), location: location.trim(), type,
      guests: Number(guests) || 2, price_per_day: Number(pricePerDay) || 0,
      image: image.trim() || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      property_type: propertyType, place_type: placeType,
      bedrooms: Number(bedrooms) || 1, beds: Number(beds) || 1, bathrooms: Number(bathrooms) || 1,
      instant_book: instantBook === null ? false : instantBook,
      self_checkin: selfCheckin === null ? false : selfCheckin,
      allows_pets: allowsPets === null ? false : allowsPets,
      is_guest_favorite: isGuestFavorite === null ? false : isGuestFavorite,
      is_luxe: isLuxe === null ? false : isLuxe,
      amenities, safety_features: safetyFeatures,
      images: cleanImages, description: description.trim(),
    };
    try {
      if (isNew) await dispatch(createRoom(roomData)).unwrap();
      else await dispatch(updateRoom({ id: room.id, ...roomData })).unwrap();
      onSave();
    } catch (err) { setError(err || `Failed to ${isNew ? "create" : "update"} room.`); }
    finally { setSaving(false); }
  }, [
    dispatch, title, location, type, guests, pricePerDay, image, tags,
    propertyType, placeType, bedrooms, beds, bathrooms,
    instantBook, selfCheckin, allowsPets, isGuestFavorite, isLuxe,
    amenities, safetyFeatures, images, description, isNew, room?.id, onSave,
  ]);

  return (
    <Modal title={isNew ? "Add New Room" : "Edit Room"} open={open} onCancel={onClose} footer={null} destroyOnClose width={680}
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}>
      <div className="space-y-5 pt-4">
        <SectionTitle>Basic Info</SectionTitle>
        <FormInput label="Room Title *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Seaside Premium Suite" />
        <FormInput label="Location *" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Los Angeles" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Room Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className={INPUT_STYLES}>
              {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <FormInput label="Max Guests" type="number" min={1} max={20} value={guests} onChange={(e) => setGuests(e.target.value)} />
        </div>
        <FormInput label="Price per Day ($)" type="number" min={0} step={0.01} value={pricePerDay} onChange={(e) => setPricePerDay(e.target.value)} />
        <FormInput label="Cover Image URL" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://example.com/image.jpg" />
        {image && (
          <div className="overflow-hidden rounded-xl border border-border">
            <img src={image} alt="Preview" className="h-32 w-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted">Gallery Images</label>
            <button type="button" onClick={() => setImages((prev) => [...prev, ""])}
              className="flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" /></svg>
              Add Image
            </button>
          </div>
          {images.length === 0 && <p className="text-xs text-muted">No gallery images yet. Add URLs for the photo gallery.</p>}
          <div className="space-y-2">
            {images.map((url, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <input className={INPUT_STYLES + " w-full"} value={url} onChange={(e) => setImages((prev) => prev.map((u, i) => i === idx ? e.target.value : u))} placeholder={`Image URL ${idx + 1}`} />
                  {url.trim() && <img src={url.trim()} alt="" className="h-16 w-24 rounded-lg border border-border object-cover" onError={(e) => { e.target.style.display = "none"; }} />}
                </div>
                <button type="button" onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))} className="mt-2 rounded-lg border border-border p-2 text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted">Description</span>
          <textarea className={`${INPUT_STYLES} min-h-[80px] resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the space, the neighborhood, what makes it special..." />
        </label>

        <FormInput label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., Ocean view, Wi-Fi, Workspace" />

        <SectionTitle>Property Details</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Property Type</span>
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={INPUT_STYLES}>
              {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Place Type</span>
            <select value={placeType} onChange={(e) => setPlaceType(e.target.value)} className={INPUT_STYLES}>
              {PLACE_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormInput label="Bedrooms" type="number" min={0} max={20} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
          <FormInput label="Beds" type="number" min={0} max={30} value={beds} onChange={(e) => setBeds(e.target.value)} />
          <FormInput label="Bathrooms" type="number" min={0} max={20} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
        </div>

        <SectionTitle>Booking Options</SectionTitle>
        <p className="text-xs text-muted">Select "None" to skip, "Yes" to enable, "No" to explicitly disable.</p>
        <div className="space-y-2">
          <TriStateToggle label="Instant Book" value={instantBook} onChange={setInstantBook} />
          <TriStateToggle label="Self Check-in" value={selfCheckin} onChange={setSelfCheckin} />
          <TriStateToggle label="Allows Pets" value={allowsPets} onChange={setAllowsPets} />
        </div>

        <SectionTitle>Standout Badges</SectionTitle>
        <p className="text-xs text-muted">Select "None" to skip. These badges appear on the listing.</p>
        <div className="space-y-2">
          <TriStateToggle label="Guest Favorite" value={isGuestFavorite} onChange={setIsGuestFavorite} />
          <TriStateToggle label="Luxe" value={isLuxe} onChange={setIsLuxe} />
        </div>

        <SectionTitle>Amenities</SectionTitle>
        <p className="text-xs text-muted">Click to toggle. Leave unselected to skip.</p>
        {AMENITY_GROUPS.map((group) => (
          <div key={group.label} className="space-y-2">
            <span className="text-xs font-semibold text-ink/70 dark:text-dark-ink/70">{group.label}</span>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <ToggleChip key={item.value} label={item.label} active={amenities.includes(item.value)} onClick={() => toggleAmenity(item.value)} />
              ))}
            </div>
          </div>
        ))}

        <SectionTitle>Safety Features</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {SAFETY_FEATURES.map((item) => (
            <ToggleChip key={item.value} label={item.label} active={safetyFeatures.includes(item.value)} onClick={() => toggleSafety(item.value)} />
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : isNew ? "Create Room" : "Save Changes"}</Button>
        </div>
      </div>
    </Modal>
  );
});

// ─── Delete Room Modal ──────────────────────────────────────

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

// ─── Room card badges for list view ─────────────────────────

function RoomCardBadges({ room }) {
  const badges = [];
  if (room.is_guest_favorite) badges.push({ label: "Guest Favorite", cls: "bg-amber-50 text-amber-700 border-amber-200" });
  if (room.is_luxe) badges.push({ label: "Luxe", cls: "bg-purple-50 text-purple-700 border-purple-200" });
  if (room.instant_book) badges.push({ label: "Instant Book", cls: "bg-blue-50 text-blue-700 border-blue-200" });
  if (badges.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {badges.map((b) => <span key={b.label} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${b.cls}`}>{b.label}</span>)}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function AdminRooms() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { rooms, loading } = useSelector((state) => state.rooms);
  const { bookings } = useSelector((state) => state.bookings);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("admin");
  const [owners, setOwners] = useState([]);

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
        <Button onClick={() => setIsCreating(true)}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Room
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted whitespace-nowrap">Filter by owner:</label>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className={`${INPUT_STYLES} min-w-[200px]`}>
          <option value="admin">My Rooms (Admin)</option>
          <option value="all">All Rooms</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>{owner.full_name || owner.email || "Unknown Owner"}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1"><input type="text" placeholder="Search by title or location..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${INPUT_STYLES} w-full`} /></div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={INPUT_STYLES}>
          <option value="all">All Types</option>
          {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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
                  <RoomCardBadges room={room} />
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                    <span>{room.guests} guests</span>
                    <span>{room.bedrooms ?? 1} bd</span>
                    <span>{room.beds ?? 1} beds</span>
                    <span>{room.bathrooms ?? 1} ba</span>
                    <span>{bookingsCount} bookings</span>
                  </div>
                  {room.amenities?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {room.amenities.slice(0, 3).map((a) => (
                        <span key={a} className="rounded-full bg-surface/80 px-2 py-0.5 text-[10px] text-muted">{a.replace(/_/g, " ")}</span>
                      ))}
                      {room.amenities.length > 3 && <span className="text-[10px] text-muted">+{room.amenities.length - 3}</span>}
                    </div>
                  )}
                  <div className="mt-3"><span className="text-lg font-bold text-brand-600">{formatPrice(room.price_per_day || 0)}</span><span className="text-sm text-muted">/day</span></div>
                  <div className="mt-4 flex gap-2 border-t border-border pt-4">
                    <button onClick={() => setViewingRoom(room)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600">View</button>
                    <button onClick={() => setEditingRoom(room)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">Edit</button>
                    <button onClick={() => setDeletingRoom(room)} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
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
