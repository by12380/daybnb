import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { formatPrice } from "../../guest/utils/format.js";
import Button from "../../guest/components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import {
  fetchOwnerRooms,
  createOwnerRoom,
  updateOwnerRoom,
  deleteOwnerRoom,
} from "../../redux/slices/ownerSlice.js";
import {
  ROOM_TYPES,
  PROPERTY_TYPES,
  PLACE_TYPES,
  AMENITY_GROUPS,
  SAFETY_FEATURES,
} from "../../guest/utils/constants.js";

// ─── Reusable form helpers ──────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h3 className="border-b border-border pb-1 text-sm font-semibold uppercase tracking-wider text-ink/60 dark:text-dark-ink/60">
      {children}
    </h3>
  );
}

function ToggleChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
          : "border-border bg-surface/60 text-muted hover:border-brand-200 hover:text-ink dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted"
      }`}
    >
      {label}
    </button>
  );
}

function TriStateToggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 dark:border-dark-border">
      <span className="text-sm text-ink dark:text-dark-ink">{label}</span>
      <div className="flex gap-1">
        {[
          { v: null, l: "None" },
          { v: true, l: "Yes" },
          { v: false, l: "No" },
        ].map(({ v, l }) => (
          <button
            key={l}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
              value === v
                ? "bg-brand-600 text-white dark:bg-brand-500"
                : "bg-surface/60 text-muted hover:bg-surface dark:bg-dark-surface/60 dark:text-dark-muted"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Room Form Modal ────────────────────────────────────────

const PLACE_TYPE_OPTIONS = PLACE_TYPES.filter((p) => p.value !== "any");

const RoomFormModal = React.memo(({ open, room, onClose, onSave, isNew }) => {
  const dispatch = useDispatch();

  // Basic fields
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("room");
  const [guests, setGuests] = useState(2);
  const [pricePerDay, setPricePerDay] = useState(100);
  const [image, setImage] = useState("");
  const [tags, setTags] = useState("");

  // New fields
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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        setPropertyType(room.property_type || "house");
        setPlaceType(room.place_type || "entire_home");
        setBedrooms(room.bedrooms ?? 1);
        setBeds(room.beds ?? 1);
        setBathrooms(room.bathrooms ?? 1);
        setInstantBook(room.instant_book ?? null);
        setSelfCheckin(room.self_checkin ?? null);
        setAllowsPets(room.allows_pets ?? null);
        setIsGuestFavorite(room.is_guest_favorite ?? null);
        setIsLuxe(room.is_luxe ?? null);
        setAmenities(room.amenities || []);
        setSafetyFeatures(room.safety_features || []);
      } else {
        setTitle(""); setLocation(""); setType("room"); setGuests(2);
        setPricePerDay(100); setImage(""); setTags("");
        setPropertyType("house"); setPlaceType("entire_home");
        setBedrooms(1); setBeds(1); setBathrooms(1);
        setInstantBook(null); setSelfCheckin(null); setAllowsPets(null);
        setIsGuestFavorite(null); setIsLuxe(null);
        setAmenities([]); setSafetyFeatures([]);
      }
      setError("");
    }
  }, [room, open, isNew]);

  const toggleAmenity = useCallback((val) => {
    setAmenities((prev) =>
      prev.includes(val) ? prev.filter((a) => a !== val) : [...prev, val]
    );
  }, []);

  const toggleSafety = useCallback((val) => {
    setSafetyFeatures((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  }, []);

  const handleSave = useCallback(async () => {
    setError("");
    if (!title.trim()) { setError("Please enter a room title."); return; }
    if (!location.trim()) { setError("Please enter a location."); return; }
    setSaving(true);

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
      bedrooms: Number(bedrooms) || 1,
      beds: Number(beds) || 1,
      bathrooms: Number(bathrooms) || 1,
      instant_book: instantBook === null ? false : instantBook,
      self_checkin: selfCheckin === null ? false : selfCheckin,
      allows_pets: allowsPets === null ? false : allowsPets,
      is_guest_favorite: isGuestFavorite === null ? false : isGuestFavorite,
      is_luxe: isLuxe === null ? false : isLuxe,
      amenities,
      safety_features: safetyFeatures,
    };

    try {
      if (isNew) { await dispatch(createOwnerRoom(roomData)).unwrap(); }
      else { await dispatch(updateOwnerRoom({ id: room.id, ...roomData })).unwrap(); }
      onSave();
    } catch (err) { setError(err || `Failed to ${isNew ? "create" : "update"} room.`); }
    finally { setSaving(false); }
  }, [
    dispatch, title, location, type, guests, pricePerDay, image, tags,
    propertyType, placeType, bedrooms, beds, bathrooms,
    instantBook, selfCheckin, allowsPets, isGuestFavorite, isLuxe,
    amenities, safetyFeatures, isNew, room?.id, onSave,
  ]);

  return (
    <Modal
      title={isNew ? "Add New Room" : "Edit Room"}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={680}
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
    >
      <div className="space-y-5 pt-4">
        {/* ── Basic Info ── */}
        <SectionTitle>Basic Info</SectionTitle>
        <FormInput label="Room Title *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Seaside Premium Suite" />
        <FormInput label="Location *" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Los Angeles" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Room Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className={INPUT_STYLES}>
              {ROOM_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </label>
          <FormInput label="Max Guests" type="number" min={1} max={20} value={guests} onChange={(e) => setGuests(e.target.value)} />
        </div>
        <FormInput label="Price per Day ($)" type="number" min={0} step={0.01} value={pricePerDay} onChange={(e) => setPricePerDay(e.target.value)} />
        <FormInput label="Image URL" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://example.com/image.jpg" />
        {image && (
          <div className="overflow-hidden rounded-xl border border-border">
            <img src={image} alt="Preview" className="h-32 w-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
          </div>
        )}
        <FormInput label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., Ocean view, Wi-Fi, Workspace" />

        {/* ── Property Details ── */}
        <SectionTitle>Property Details</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Property Type</span>
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={INPUT_STYLES}>
              {PROPERTY_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Place Type</span>
            <select value={placeType} onChange={(e) => setPlaceType(e.target.value)} className={INPUT_STYLES}>
              {PLACE_TYPE_OPTIONS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormInput label="Bedrooms" type="number" min={0} max={20} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
          <FormInput label="Beds" type="number" min={0} max={30} value={beds} onChange={(e) => setBeds(e.target.value)} />
          <FormInput label="Bathrooms" type="number" min={0} max={20} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
        </div>

        {/* ── Booking Options (tri-state: None / Yes / No) ── */}
        <SectionTitle>Booking Options</SectionTitle>
        <p className="text-xs text-muted">Select "None" to skip, "Yes" to enable, "No" to explicitly disable.</p>
        <div className="space-y-2">
          <TriStateToggle label="Instant Book" value={instantBook} onChange={setInstantBook} />
          <TriStateToggle label="Self Check-in" value={selfCheckin} onChange={setSelfCheckin} />
          <TriStateToggle label="Allows Pets" value={allowsPets} onChange={setAllowsPets} />
        </div>

        {/* ── Standout Badges ── */}
        <SectionTitle>Standout Badges</SectionTitle>
        <p className="text-xs text-muted">Select "None" to skip. These badges appear on the listing.</p>
        <div className="space-y-2">
          <TriStateToggle label="Guest Favorite" value={isGuestFavorite} onChange={setIsGuestFavorite} />
          <TriStateToggle label="Luxe" value={isLuxe} onChange={setIsLuxe} />
        </div>

        {/* ── Amenities ── */}
        <SectionTitle>Amenities</SectionTitle>
        <p className="text-xs text-muted">Click to toggle. Leave unselected to skip.</p>
        {AMENITY_GROUPS.map((group) => (
          <div key={group.label} className="space-y-2">
            <span className="text-xs font-semibold text-ink/70 dark:text-dark-ink/70">{group.label}</span>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <ToggleChip
                  key={item.value}
                  label={item.label}
                  active={amenities.includes(item.value)}
                  onClick={() => toggleAmenity(item.value)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* ── Safety Features ── */}
        <SectionTitle>Safety Features</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {SAFETY_FEATURES.map((item) => (
            <ToggleChip
              key={item.value}
              label={item.label}
              active={safetyFeatures.includes(item.value)}
              onClick={() => toggleSafety(item.value)}
            />
          ))}
        </div>

        {/* ── Actions ── */}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Create Room" : "Save Changes"}
          </Button>
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
    try { await dispatch(deleteOwnerRoom(room.id)).unwrap(); onConfirm(); }
    catch (err) { setError(err || "Failed to delete room."); }
    finally { setDeleting(false); }
  }, [dispatch, room?.id, onConfirm]);

  return (
    <Modal title="Delete Room" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted">Are you sure you want to delete this room? This action cannot be undone.</p>
        {room && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
            <div className="flex items-center gap-3">
              {room.image && <img src={room.image} alt={room.title} className="h-12 w-12 rounded-lg object-cover" />}
              <div><p className="font-medium text-ink">{room.title}</p><p className="text-sm text-muted">{room.location}</p></div>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="!bg-red-600 hover:!bg-red-700" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete Room"}</Button>
        </div>
      </div>
    </Modal>
  );
});

// ─── Room Card (list view) ──────────────────────────────────

function RoomCardBadges({ room }) {
  const badges = [];
  if (room.is_guest_favorite) badges.push({ label: "Guest Favorite", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700" });
  if (room.is_luxe) badges.push({ label: "Luxe", cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700" });
  if (room.instant_book) badges.push({ label: "Instant Book", cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700" });
  if (badges.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {badges.map((b) => (
        <span key={b.label} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${b.cls}`}>{b.label}</span>
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function OwnerRooms() {
  const dispatch = useDispatch();
  const { rooms, loading } = useSelector((state) => state.owner);

  const [searchTerm, setSearchTerm] = useState("");
  const [editingRoom, setEditingRoom] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => { dispatch(fetchOwnerRooms()); }, [dispatch]);

  const filteredRooms = useMemo(() => {
    if (!searchTerm) return rooms || [];
    const search = searchTerm.toLowerCase();
    return (rooms || []).filter((room) => room.title?.toLowerCase().includes(search) || room.location?.toLowerCase().includes(search));
  }, [rooms, searchTerm]);

  const handleSave = useCallback(() => { setEditingRoom(null); setIsCreating(false); dispatch(fetchOwnerRooms()); }, [dispatch]);
  const handleDeleteConfirm = useCallback(() => { setDeletingRoom(null); }, []);

  if (loading && (!rooms || rooms.length === 0)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm text-muted">Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">My Rooms</h1>
          <p className="mt-1 text-sm text-muted">Manage your property listings ({(rooms || []).length} total)</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Room
        </Button>
      </div>

      <div className="flex-1">
        <input type="text" placeholder="Search by title or location..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${INPUT_STYLES} w-full max-w-md`} />
      </div>

      {filteredRooms.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel py-12 text-center shadow-sm">
          <p className="mt-4 text-sm font-medium text-ink">No rooms found</p>
          <p className="mt-1 text-sm text-muted">{searchTerm ? "Try adjusting your search" : "Add your first room to get started"}</p>
          {!searchTerm && <div className="mt-4"><Button onClick={() => setIsCreating(true)}>Add Room</Button></div>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => (
            <div key={room.id} className="overflow-hidden rounded-2xl border border-border bg-panel shadow-sm transition-shadow hover:shadow-md">
              {room.image && <img src={room.image} alt={room.title} className="h-40 w-full object-cover" />}
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div><h3 className="font-semibold text-ink">{room.title}</h3><p className="text-sm text-muted">{room.location}</p></div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{room.type}</span>
                </div>
                <RoomCardBadges room={room} />
                <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                  <span>{room.guests} guests</span>
                  <span>{room.bedrooms ?? 1} bd</span>
                  <span>{room.beds ?? 1} beds</span>
                  <span>{room.bathrooms ?? 1} ba</span>
                </div>
                {(room.amenities?.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {room.amenities.slice(0, 3).map((a) => (
                      <span key={a} className="rounded-full bg-surface/80 px-2 py-0.5 text-[10px] text-muted dark:bg-dark-surface/80">{a.replace(/_/g, " ")}</span>
                    ))}
                    {room.amenities.length > 3 && <span className="text-[10px] text-muted">+{room.amenities.length - 3}</span>}
                  </div>
                )}
                <div className="mt-3">
                  <span className="text-lg font-bold text-emerald-600">{formatPrice(room.price_per_day || 0)}</span>
                  <span className="text-sm text-muted">/day</span>
                </div>
                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  <button onClick={() => setEditingRoom(room)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">Edit</button>
                  <button onClick={() => setDeletingRoom(room)} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <RoomFormModal open={!!editingRoom || isCreating} room={editingRoom} isNew={isCreating} onClose={() => { setEditingRoom(null); setIsCreating(false); }} onSave={handleSave} />
      <DeleteRoomModal open={!!deletingRoom} room={deletingRoom} onClose={() => setDeletingRoom(null)} onConfirm={handleDeleteConfirm} />
    </div>
  );
}
