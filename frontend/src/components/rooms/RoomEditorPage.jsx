import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../../redux/api.js";
import {
  createRoom,
  updateRoom,
} from "../../redux/slices/roomSlice.js";
import {
  createOwnerRoom,
  updateOwnerRoom,
} from "../../redux/slices/ownerSlice.js";
import Button from "../../guest/components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import { formatPrice } from "../../guest/utils/format.js";
import {
  ROOM_TYPES,
  PROPERTY_TYPES,
  PLACE_TYPES,
  AMENITY_GROUPS,
  SAFETY_FEATURES,
} from "../../guest/utils/constants.js";

const PLACE_TYPE_OPTIONS = PLACE_TYPES.filter((item) => item.value !== "any");

const PANEL_CONFIG = {
  admin: {
    listPath: "/admin/rooms",
    eyebrow: "Admin panel",
    emptyMessage: "Build a polished listing with guest-facing details, gallery images, and operational settings.",
    saveLabel: "Save changes",
    createLabel: "Create room",
  },
  owner: {
    listPath: "/owner/rooms",
    eyebrow: "Owner panel",
    emptyMessage: "Shape the guest experience with your pricing, media gallery, amenities, and booking preferences.",
    saveLabel: "Save changes",
    createLabel: "Create room",
  },
};

function SectionTitle({ children, description }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-3">
      <div>
        <h2 className="text-base font-semibold text-ink dark:text-dark-ink">{children}</h2>
        {description && <p className="mt-1 text-sm text-muted dark:text-dark-muted">{description}</p>}
      </div>
    </div>
  );
}

function SectionCard({ children }) {
  return (
    <section className="rounded-3xl border border-border bg-panel/80 p-5 shadow-sm backdrop-blur dark:border-dark-border dark:bg-dark-panel/80 sm:p-6">
      {children}
    </section>
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
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/50 px-4 py-3 dark:border-dark-border dark:bg-dark-surface/40">
      <div>
        <p className="text-sm font-medium text-ink dark:text-dark-ink">{label}</p>
        <p className="text-xs text-muted dark:text-dark-muted">Choose how this option appears on the listing.</p>
      </div>
      <div className="flex shrink-0 gap-1">
        {[
          { v: null, l: "None" },
          { v: true, l: "Yes" },
          { v: false, l: "No" },
        ].map(({ v, l }) => (
          <button
            key={l}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              value === v
                ? "bg-brand-600 text-white dark:bg-brand-500"
                : "bg-panel text-muted hover:bg-surface hover:text-ink dark:bg-dark-panel dark:text-dark-muted dark:hover:bg-dark-surface dark:hover:text-dark-ink"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReadOnlyTextField({ label, value, placeholder = "Not set" }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-muted dark:text-dark-muted">{label}</span>
      <div className="rounded-xl border border-border bg-surface/40 px-3 py-2 text-sm text-ink dark:border-dark-border dark:bg-dark-surface/30 dark:text-dark-ink">
        {value || <span className="text-muted dark:text-dark-muted">{placeholder}</span>}
      </div>
    </div>
  );
}

function normalizeRoomForForm(room) {
  return {
    title: room?.title || "",
    location: room?.location || "",
    type: room?.type || "room",
    guests: room?.guests ?? 2,
    pricePerDay: room?.price_per_day ?? 100,
    image: room?.image || "",
    tags: room?.tags?.join(", ") || "",
    propertyType: room?.property_type || "house",
    placeType: room?.place_type || "entire_home",
    bedrooms: room?.bedrooms ?? 1,
    beds: room?.beds ?? 1,
    bathrooms: room?.bathrooms ?? 1,
    instantBook: room?.instant_book ?? null,
    selfCheckin: room?.self_checkin ?? null,
    allowsPets: room?.allows_pets ?? null,
    isGuestFavorite: room?.is_guest_favorite ?? null,
    isLuxe: room?.is_luxe ?? null,
    amenities: room?.amenities || [],
    safetyFeatures: room?.safety_features || [],
    images: room?.images || [],
    description: room?.description || "",
  };
}

function buildPayload(form) {
  return {
    title: form.title.trim(),
    location: form.location.trim(),
    type: form.type,
    guests: Number(form.guests) || 2,
    price_per_day: Number(form.pricePerDay) || 0,
    image: form.image.trim() || null,
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    property_type: form.propertyType,
    place_type: form.placeType,
    bedrooms: Number(form.bedrooms) || 1,
    beds: Number(form.beds) || 1,
    bathrooms: Number(form.bathrooms) || 1,
    instant_book: form.instantBook === null ? false : form.instantBook,
    self_checkin: form.selfCheckin === null ? false : form.selfCheckin,
    allows_pets: form.allowsPets === null ? false : form.allowsPets,
    is_guest_favorite: form.isGuestFavorite === null ? false : form.isGuestFavorite,
    is_luxe: form.isLuxe === null ? false : form.isLuxe,
    amenities: form.amenities,
    safety_features: form.safetyFeatures,
    images: form.images.map((url) => url.trim()).filter(Boolean),
    description: form.description.trim(),
  };
}

export default function RoomEditorPage({ panel = "admin", mode = "edit" }) {
  const config = PANEL_CONFIG[panel] || PANEL_CONFIG.admin;
  const { roomId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isViewMode = mode === "view";

  const isNew = !roomId || roomId === "new";
  const [form, setForm] = useState(() => normalizeRoomForForm(null));
  const [roomMeta, setRoomMeta] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (isNew) {
      setForm(normalizeRoomForForm(null));
      setRoomMeta(null);
      setLoadingRoom(false);
      setLoadError("");
      return;
    }

    let cancelled = false;
    setLoadingRoom(true);
    setLoadError("");

    api
      .get(`/rooms/${roomId}`)
      .then(({ data }) => {
        if (cancelled) return;
        const nextRoom = data?.room || null;
        if (!nextRoom) {
          setLoadError("Room not found.");
          setLoadingRoom(false);
          return;
        }
        setRoomMeta(nextRoom);
        setForm(normalizeRoomForForm(nextRoom));
        setLoadingRoom(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error?.message || "Failed to load room.");
        setLoadingRoom(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isNew, roomId]);

  const updateField = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const toggleAmenity = useCallback((value) => {
    setForm((current) => ({
      ...current,
      amenities: current.amenities.includes(value)
        ? current.amenities.filter((item) => item !== value)
        : [...current.amenities, value],
    }));
  }, []);

  const toggleSafety = useCallback((value) => {
    setForm((current) => ({
      ...current,
      safetyFeatures: current.safetyFeatures.includes(value)
        ? current.safetyFeatures.filter((item) => item !== value)
        : [...current.safetyFeatures, value],
    }));
  }, []);

  const previewImages = useMemo(() => {
    const urls = [form.image, ...form.images]
      .map((url) => url.trim())
      .filter(Boolean);

    return urls.filter((url, index) => urls.indexOf(url) === index);
  }, [form.image, form.images]);

  const handleSave = useCallback(async () => {
    setSaveError("");

    if (!form.title.trim()) {
      setSaveError("Please enter a room title.");
      return;
    }

    if (!form.location.trim()) {
      setSaveError("Please enter a location.");
      return;
    }

    const payload = buildPayload(form);
    setSaving(true);

    try {
      if (panel === "owner") {
        if (isNew) {
          await dispatch(createOwnerRoom(payload)).unwrap();
        } else {
          await dispatch(updateOwnerRoom({ id: roomId, ...payload })).unwrap();
        }
      } else if (isNew) {
        await dispatch(createRoom(payload)).unwrap();
      } else {
        await dispatch(updateRoom({ id: roomId, ...payload })).unwrap();
      }

      navigate(config.listPath);
    } catch (error) {
      setSaveError(error || `Failed to ${isNew ? "create" : "update"} room.`);
    } finally {
      setSaving(false);
    }
  }, [config.listPath, dispatch, form, isNew, navigate, panel, roomId]);

  if (loadingRoom) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted dark:text-dark-muted">Loading room editor...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-3xl border border-border bg-panel p-8 text-center shadow-sm dark:border-dark-border dark:bg-dark-panel">
        <p className="text-base font-semibold text-ink dark:text-dark-ink">Unable to open this room</p>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{loadError}</p>
        <div className="mt-6">
          <Link to={config.listPath}>
            <Button variant="outline">Back to rooms</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-border bg-gradient-to-br from-panel via-panel to-brand-50/60 p-6 shadow-sm dark:border-dark-border dark:from-dark-panel dark:via-dark-panel dark:to-brand-900/10 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-400">
              {config.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink dark:text-dark-ink">
              {isViewMode
                ? `View ${form.title || "room listing"}`
                : isNew
                  ? "Create room listing"
                  : `Edit ${form.title || "room listing"}`}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted dark:text-dark-muted">
              {isViewMode
                ? "Review the full listing in a dedicated page while keeping the preview pinned on the right."
                : config.emptyMessage}
            </p>
            {!isNew && roomMeta?.id && (
              <p className="mt-3 text-xs font-medium text-muted dark:text-dark-muted">
                Room ID: <span className="font-mono">{roomMeta.id}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => navigate(config.listPath)}>
              {isViewMode ? "Back to rooms" : "Cancel"}
            </Button>
            {isViewMode ? (
              <Button onClick={() => navigate(`${config.listPath}/${roomId}/edit`)}>
                Edit room
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : isNew ? config.createLabel : config.saveLabel}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SectionCard>
            <SectionTitle description="Start with the information guests see first in search and detail views.">
              Basic info
            </SectionTitle>
            <div className="grid gap-4">
              {isViewMode ? (
                <ReadOnlyTextField label="Room title" value={form.title} placeholder="Untitled room" />
              ) : (
                <FormInput
                  label="Room title *"
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="e.g., Seaside Premium Suite"
                />
              )}
              {isViewMode ? (
                <ReadOnlyTextField label="Location" value={form.location} />
              ) : (
                <FormInput
                  label="Location *"
                  value={form.location}
                  onChange={(event) => updateField("location", event.target.value)}
                  placeholder="e.g., Los Angeles"
                />
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-muted dark:text-dark-muted">Room type</span>
                  <select
                    value={form.type}
                    onChange={(event) => updateField("type", event.target.value)}
                    className={INPUT_STYLES}
                    disabled={isViewMode}
                  >
                    {ROOM_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <FormInput
                  label="Max guests"
                  type="number"
                  min={1}
                  max={20}
                  value={form.guests}
                  onChange={(event) => updateField("guests", event.target.value)}
                  disabled={isViewMode}
                />
              </div>
              <FormInput
                label="Price per day ($)"
                type="number"
                min={0}
                step={0.01}
                value={form.pricePerDay}
                onChange={(event) => updateField("pricePerDay", event.target.value)}
                disabled={isViewMode}
              />
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted dark:text-dark-muted">Description</span>
                <textarea
                  className={`${INPUT_STYLES} min-h-[140px] resize-y`}
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Describe the space, nearby highlights, and what makes it memorable."
                  readOnly={isViewMode}
                />
              </label>
              {isViewMode ? (
                <ReadOnlyTextField label="Tags" value={form.tags} placeholder="No tags added" />
              ) : (
                <FormInput
                  label="Tags (comma-separated)"
                  value={form.tags}
                  onChange={(event) => updateField("tags", event.target.value)}
                  placeholder="e.g., Ocean view, Wi-Fi, Workspace"
                />
              )}
            </div>
          </SectionCard>

          <SectionCard>
            <SectionTitle description="Add a cover photo plus any extra gallery images from the backend.">
              Media
            </SectionTitle>
            <div className="space-y-4">
              <FormInput
                label="Cover image URL"
                value={form.image}
                onChange={(event) => updateField("image", event.target.value)}
                placeholder="https://example.com/cover.jpg"
                disabled={isViewMode}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted dark:text-dark-muted">Gallery images</p>
                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={() => updateField("images", [...form.images, ""])}
                      className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50"
                    >
                      Add image
                    </button>
                  )}
                </div>

                {form.images.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-4 py-5 text-sm text-muted dark:border-dark-border dark:bg-dark-surface/30 dark:text-dark-muted">
                    No extra gallery images yet. Add URLs to show more angles and details without replacing the cover.
                  </div>
                )}

                <div className="space-y-3">
                  {form.images.map((url, index) => (
                    <div
                      key={`${index}-${url}`}
                      className="rounded-2xl border border-border bg-surface/40 p-3 dark:border-dark-border dark:bg-dark-surface/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-2">
                          <input
                            className={`${INPUT_STYLES} w-full`}
                            value={url}
                            onChange={(event) =>
                              updateField(
                                "images",
                                form.images.map((current, currentIndex) =>
                                  currentIndex === index ? event.target.value : current
                                )
                              )
                            }
                            placeholder={`Image URL ${index + 1}`}
                            disabled={isViewMode}
                          />
                          {url.trim() && (
                            <img
                              src={url.trim()}
                              alt=""
                              className="h-20 w-28 rounded-2xl border border-border object-cover dark:border-dark-border"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        </div>
                        {!isViewMode && (
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                "images",
                                form.images.filter((_, currentIndex) => currentIndex !== index)
                              )
                            }
                            className="rounded-full border border-border p-2 text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-dark-border dark:text-dark-muted dark:hover:border-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <SectionTitle description="Set the property structure and sleeping layout for the listing card and details page.">
              Property details
            </SectionTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted dark:text-dark-muted">Property type</span>
                <select
                  value={form.propertyType}
                  onChange={(event) => updateField("propertyType", event.target.value)}
                  className={INPUT_STYLES}
                  disabled={isViewMode}
                >
                  {PROPERTY_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted dark:text-dark-muted">Place type</span>
                <select
                  value={form.placeType}
                  onChange={(event) => updateField("placeType", event.target.value)}
                  className={INPUT_STYLES}
                  disabled={isViewMode}
                >
                  {PLACE_TYPE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <FormInput
                label="Bedrooms"
                type="number"
                min={0}
                max={20}
                value={form.bedrooms}
                onChange={(event) => updateField("bedrooms", event.target.value)}
                disabled={isViewMode}
              />
              <FormInput
                label="Beds"
                type="number"
                min={0}
                max={30}
                value={form.beds}
                onChange={(event) => updateField("beds", event.target.value)}
                disabled={isViewMode}
              />
              <FormInput
                label="Bathrooms"
                type="number"
                min={0}
                max={20}
                value={form.bathrooms}
                onChange={(event) => updateField("bathrooms", event.target.value)}
                disabled={isViewMode}
              />
            </div>
          </SectionCard>

          <SectionCard>
            <SectionTitle description="Tune booking behavior and featured listing badges.">
              Guest experience
            </SectionTitle>
            <div className="space-y-3">
              <TriStateToggle label="Instant book" value={form.instantBook} onChange={isViewMode ? () => {} : (value) => updateField("instantBook", value)} />
              <TriStateToggle label="Self check-in" value={form.selfCheckin} onChange={isViewMode ? () => {} : (value) => updateField("selfCheckin", value)} />
              <TriStateToggle label="Allows pets" value={form.allowsPets} onChange={isViewMode ? () => {} : (value) => updateField("allowsPets", value)} />
              <TriStateToggle label="Guest favorite" value={form.isGuestFavorite} onChange={isViewMode ? () => {} : (value) => updateField("isGuestFavorite", value)} />
              <TriStateToggle label="Luxe" value={form.isLuxe} onChange={isViewMode ? () => {} : (value) => updateField("isLuxe", value)} />
            </div>
          </SectionCard>

          <SectionCard>
            <SectionTitle description="Highlight what the room includes and the safety expectations guests should see.">
              Amenities and safety
            </SectionTitle>
            <div className="space-y-5">
              {AMENITY_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink/60 dark:text-dark-ink/60">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <ToggleChip
                        key={item.value}
                        label={item.label}
                        active={form.amenities.includes(item.value)}
                        onClick={isViewMode ? () => {} : () => toggleAmenity(item.value)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink/60 dark:text-dark-ink/60">
                  Safety features
                </p>
                <div className="flex flex-wrap gap-2">
                  {SAFETY_FEATURES.map((item) => (
                    <ToggleChip
                      key={item.value}
                      label={item.label}
                      active={form.safetyFeatures.includes(item.value)}
                      onClick={isViewMode ? () => {} : () => toggleSafety(item.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {!isViewMode && saveError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {saveError}
            </div>
          )}

          {!isViewMode && (
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => navigate(config.listPath)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : isNew ? config.createLabel : config.saveLabel}
              </Button>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="sticky top-24 space-y-6">
            <SectionCard>
              <SectionTitle description="Live summary of how the room content is shaping up.">
                Preview
              </SectionTitle>

              <div className="overflow-hidden rounded-[26px] border border-border bg-surface shadow-sm dark:border-dark-border dark:bg-dark-surface">
                {previewImages[0] ? (
                  <img src={previewImages[0]} alt={form.title || "Room preview"} className="h-52 w-full object-cover" />
                ) : (
                  <div className="flex h-52 items-center justify-center bg-gradient-to-br from-brand-50 via-surface to-brand-100 text-sm text-muted dark:from-brand-900/20 dark:via-dark-surface dark:to-brand-800/10 dark:text-dark-muted">
                    Add a cover image to preview the listing.
                  </div>
                )}

                <div className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-ink dark:text-dark-ink">
                        {form.title || "Untitled room"}
                      </h3>
                      <p className="mt-1 text-sm text-muted dark:text-dark-muted">
                        {form.location || "Location not set yet"}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold capitalize text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                      {form.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-surface/70 p-3 text-center dark:bg-dark-panel">
                      <p className="text-lg font-bold text-ink dark:text-dark-ink">
                        {formatPrice(Number(form.pricePerDay) || 0)}
                      </p>
                      <p className="text-xs text-muted dark:text-dark-muted">Per day</p>
                    </div>
                    <div className="rounded-2xl bg-surface/70 p-3 text-center dark:bg-dark-panel">
                      <p className="text-lg font-bold text-ink dark:text-dark-ink">{Number(form.guests) || 0}</p>
                      <p className="text-xs text-muted dark:text-dark-muted">Guests</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {form.instantBook && (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        Instant book
                      </span>
                    )}
                    {form.selfCheckin && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        Self check-in
                      </span>
                    )}
                    {form.allowsPets && (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        Pets allowed
                      </span>
                    )}
                    {form.isGuestFavorite && (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        Guest favorite
                      </span>
                    )}
                    {form.isLuxe && (
                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        Luxe
                      </span>
                    )}
                  </div>

                  {previewImages.length > 1 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/60 dark:text-dark-ink/60">
                          Gallery
                        </p>
                        <p className="text-xs text-muted dark:text-dark-muted">
                          {previewImages.length} image{previewImages.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {previewImages.slice(0, 8).map((url, index) => (
                          <img
                            key={`${url}-${index}`}
                            src={url}
                            alt=""
                            className="aspect-square rounded-2xl border border-border object-cover dark:border-dark-border"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <SectionTitle description="Quick totals to keep the listing balanced.">
                Listing summary
              </SectionTitle>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-muted dark:text-dark-muted">
                  <span>Images</span>
                  <span className="font-semibold text-ink dark:text-dark-ink">{previewImages.length}</span>
                </div>
                <div className="flex items-center justify-between text-muted dark:text-dark-muted">
                  <span>Amenities</span>
                  <span className="font-semibold text-ink dark:text-dark-ink">{form.amenities.length}</span>
                </div>
                <div className="flex items-center justify-between text-muted dark:text-dark-muted">
                  <span>Safety features</span>
                  <span className="font-semibold text-ink dark:text-dark-ink">{form.safetyFeatures.length}</span>
                </div>
                <div className="flex items-center justify-between text-muted dark:text-dark-muted">
                  <span>Tags</span>
                  <span className="font-semibold text-ink dark:text-dark-ink">
                    {form.tags
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean).length}
                  </span>
                </div>
              </div>
            </SectionCard>
          </div>
        </aside>
      </div>
    </div>
  );
}
