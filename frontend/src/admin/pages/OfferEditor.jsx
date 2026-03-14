import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Button from "../../guest/components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import OfferBannerCanvas from "../../components/OfferBannerCanvas.jsx";
import {
  OFFER_BACKGROUND_TYPES,
  OFFER_BANNER_DEFAULTS,
  OFFER_DISCOUNT_TYPES,
  OFFER_GRADIENT_DIRECTIONS,
  OFFER_PREVIEW_DEVICES,
  OFFER_TEXT_ALIGNMENTS,
  clampOfferBoxPosition,
  getOfferBoxWidthPercent,
  getOfferPreviewFrame,
  normalizeOfferBanner,
} from "../../lib/offerBanner.js";
import {
  createAdminOffer,
  fetchAdminOffers,
  updateAdminOffer,
} from "../../redux/slices/offerSlice.js";
import { fetchRooms } from "../../redux/slices/roomSlice.js";
import api from "../../redux/api.js";

const DEVICE_ICONS = {
  desktop: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  tablet: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  mobile: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
};

function RangeField({ label, value, onChange, min, max, step = 1, suffix = "" }) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className="rounded-md bg-surface/80 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-ink">
          {value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-brand-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:shadow-md"
      />
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-panel px-2.5 py-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded-lg border border-border bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none"
        />
      </div>
    </label>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div className="rounded-2xl border border-border bg-panel/60 p-4 shadow-sm backdrop-blur-sm">
      {(title || description) && (
        <div className="mb-3 border-b border-border/50 pb-3">
          {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export default function OfferEditor() {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { offers, loading: storeLoading } = useSelector((s) => s.offers);
  const { rooms } = useSelector((s) => s.rooms);

  const isNew = !offerId || offerId === "new";
  const existingOffer = useMemo(
    () => (isNew ? null : (offers || []).find((o) => o.id === offerId)),
    [offers, offerId, isNew],
  );

  const previewRef = useRef(null);
  const dragStateRef = useRef(null);
  const [form, setForm] = useState(OFFER_BANNER_DEFAULTS);
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [owners, setOwners] = useState([]);

  useEffect(() => {
    if (!offers || offers.length === 0) {
      dispatch(fetchAdminOffers());
    }
    dispatch(fetchRooms({ limit: 500 }));
    api.get("/admin/owners", { params: { limit: 200 } })
      .then(({ data }) => setOwners(data.owners || []))
      .catch(() => {});
  }, [dispatch, offers]);

  useEffect(() => {
    if (loaded) return;
    if (isNew) {
      setForm(normalizeOfferBanner(OFFER_BANNER_DEFAULTS));
      setLoaded(true);
    } else if (existingOffer) {
      setForm(normalizeOfferBanner(existingOffer));
      setLoaded(true);
    }
  }, [existingOffer, isNew, loaded]);

  useEffect(() => {
    return () => {
      if (dragStateRef.current) {
        window.removeEventListener("pointermove", dragStateRef.current.onMove);
        window.removeEventListener("pointerup", dragStateRef.current.onUp);
      }
    };
  }, []);

  const updateField = useCallback((field, value) => {
    setForm((c) => ({ ...c, [field]: value }));
  }, []);

  const stopDragging = useCallback(() => {
    if (!dragStateRef.current) return;
    window.removeEventListener("pointermove", dragStateRef.current.onMove);
    window.removeEventListener("pointerup", dragStateRef.current.onUp);
    dragStateRef.current = null;
  }, []);

  const handleBoxPointerDown = useCallback(
    (event) => {
      if (!previewRef.current) return;
      event.preventDefault();

      const rect = previewRef.current.getBoundingClientRect();
      const widthPercent = getOfferBoxWidthPercent(form, previewDevice);
      const position = clampOfferBoxPosition(form, previewDevice);
      const boxLeft = (rect.width * position.left) / 100;
      const boxTop = (rect.height * position.top) / 100;
      const pointerOffsetX = event.clientX - rect.left - boxLeft;
      const pointerOffsetY = event.clientY - rect.top - boxTop;
      const maxLeftPercent = Math.max(0, 100 - widthPercent);

      stopDragging();

      const xField = `banner_box_x_${previewDevice}`;
      const yField = `banner_box_y_${previewDevice}`;

      const onMove = (moveEvent) => {
        const nextLeftPx = moveEvent.clientX - rect.left - pointerOffsetX;
        const nextTopPx = moveEvent.clientY - rect.top - pointerOffsetY;
        const leftPercent = Math.min(Math.max((nextLeftPx / rect.width) * 100, 0), maxLeftPercent);
        const topPercent = Math.min(Math.max((nextTopPx / rect.height) * 100, 0), 76);

        setForm((c) => ({
          ...c,
          [xField]: Number(leftPercent.toFixed(2)),
          [yField]: Number(topPercent.toFixed(2)),
        }));
      };

      const onUp = () => stopDragging();

      dragStateRef.current = { onMove, onUp };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [form, previewDevice, stopDragging],
  );

  const normalizedForm = useMemo(() => normalizeOfferBanner(form), [form]);
  const previewFrame = useMemo(() => getOfferPreviewFrame(previewDevice), [previewDevice]);

  const cleanText = useCallback((value) => {
    if (value === null || value === undefined) return null;
    const next = String(value).trim();
    return next || null;
  }, []);

  const handleSave = useCallback(async () => {
    setError("");
    if (!normalizedForm.title.trim()) {
      setError("Offer title is required.");
      return;
    }
    if (!normalizedForm.end_date) {
      setError("End date is required.");
      return;
    }
    if (
      normalizedForm.show_banner &&
      normalizedForm.banner_background_type === "image" &&
      !normalizedForm.banner_image?.trim()
    ) {
      setError("Banner image URL is required when using image background.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: String(normalizedForm.title || "").trim(),
        description: cleanText(normalizedForm.description),
        tag_label: cleanText(normalizedForm.tag_label),
        discount_type: normalizedForm.discount_type,
        discount_value: Number(normalizedForm.discount_value) || 0,
        banner_image: cleanText(normalizedForm.banner_image),
        show_banner: !!normalizedForm.show_banner,
        room_id: normalizedForm.room_id || null,
        owner_id: normalizedForm.owner_id || null,
        start_date: normalizedForm.start_date || undefined,
        end_date: normalizedForm.end_date,
        banner_background_type: normalizedForm.banner_background_type,
        banner_background_color: cleanText(normalizedForm.banner_background_color),
        banner_gradient_from: cleanText(normalizedForm.banner_gradient_from),
        banner_gradient_to: cleanText(normalizedForm.banner_gradient_to),
        banner_gradient_direction: normalizedForm.banner_gradient_direction,
        banner_background_opacity: Number(normalizedForm.banner_background_opacity),
        banner_text_alignment: normalizedForm.banner_text_alignment,
        banner_box_x_desktop: Number(normalizedForm.banner_box_x_desktop),
        banner_box_y_desktop: Number(normalizedForm.banner_box_y_desktop),
        banner_box_x_tablet: Number(normalizedForm.banner_box_x_tablet),
        banner_box_y_tablet: Number(normalizedForm.banner_box_y_tablet),
        banner_box_x_mobile: Number(normalizedForm.banner_box_x_mobile),
        banner_box_y_mobile: Number(normalizedForm.banner_box_y_mobile),
        banner_box_width_desktop: Number(normalizedForm.banner_box_width_desktop),
        banner_box_width_tablet: Number(normalizedForm.banner_box_width_tablet),
        banner_box_width_mobile: Number(normalizedForm.banner_box_width_mobile),
      };

      if (isNew) {
        await dispatch(createAdminOffer(payload)).unwrap();
      } else {
        await dispatch(updateAdminOffer({ id: offerId, ...payload })).unwrap();
      }
      navigate("/admin/offers");
    } catch (err) {
      setError(err || `Failed to ${isNew ? "create" : "update"} offer.`);
    } finally {
      setSaving(false);
    }
  }, [offerId, cleanText, dispatch, isNew, navigate, normalizedForm]);

  const handleCancel = useCallback(() => {
    navigate("/admin/offers");
  }, [navigate]);

  if (!isNew && !existingOffer && storeLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading offer...</p>
        </div>
      </div>
    );
  }

  if (!isNew && !existingOffer && !storeLoading && offers && offers.length > 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted">Offer not found.</p>
        <Button variant="outline" onClick={handleCancel}>Back to Offers</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-panel text-muted shadow-sm transition hover:bg-surface/80 hover:text-ink"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-ink">
              {isNew ? "Create Offer" : "Edit Offer"}
            </h1>
            <p className="text-xs text-muted">
              {isNew ? "Set up a new promotional offer" : `Editing: ${existingOffer?.title || "Offer"}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Create Offer" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Banner toggle */}
      <div className="mb-5">
        <div className="rounded-2xl border border-border bg-panel/60 p-4 shadow-sm">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.show_banner}
              onChange={(e) => updateField("show_banner", e.target.checked)}
              className="h-5 w-5 rounded border-border text-brand-600 focus:ring-brand-500"
            />
            <div>
              <span className="text-sm font-semibold text-ink">Display as campaign banner on landing page</span>
              <p className="text-xs text-muted">
                When enabled, this offer will appear as a prominent banner on the landing screen with a customizable layout.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Banner preview section — only when show_banner is on */}
      {form.show_banner && (
        <div className="mb-6">
          <div className="rounded-2xl border border-border bg-panel/80 p-4 shadow-lg backdrop-blur-sm">
            {/* Device switcher */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted">Banner Preview</span>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Live
                </span>
              </div>
              <div className="inline-flex rounded-xl border border-border bg-surface/60 p-1">
                {OFFER_PREVIEW_DEVICES.map((device) => (
                  <button
                    key={device.value}
                    type="button"
                    onClick={() => setPreviewDevice(device.value)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      previewDevice === device.value
                        ? "bg-brand-600 text-white shadow-md"
                        : "text-muted hover:bg-panel hover:text-ink"
                    }`}
                  >
                    {DEVICE_ICONS[device.value]}
                    {device.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview canvas */}
            <div className="flex justify-center">
              <div
                className="w-full transition-all duration-300 ease-out"
                style={{
                  maxWidth: previewDevice === "mobile" ? "390px" : previewDevice === "tablet" ? "720px" : "100%",
                }}
              >
                <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted/60">
                  {previewDevice} | {previewFrame.label}
                </p>
                <OfferBannerCanvas
                  offer={normalizedForm}
                  device={previewDevice}
                  containerRef={previewRef}
                  onTextBoxPointerDown={handleBoxPointerDown}
                  preview
                  className="w-full"
                  style={{ aspectRatio: previewFrame.aspectRatio }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form controls */}
      <div className={`grid gap-5 pb-8 ${form.show_banner ? "lg:grid-cols-2 xl:grid-cols-3" : "lg:grid-cols-2"}`}>
        {/* Offer details */}
        <SectionCard title="Offer Details" description="Title, discount, and scheduling">
          <div className="space-y-3">
            <FormInput
              label="Offer Title"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g., Summer Sale 20% Off"
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Description (optional)</span>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Brief description of the offer"
                rows={3}
                className={`${INPUT_STYLES} min-h-[80px] resize-y`}
              />
            </label>
            <FormInput
              label="Tag / Badge Label (optional)"
              value={form.tag_label}
              onChange={(e) => updateField("tag_label", e.target.value)}
              placeholder="e.g., Diwali Special, Black Friday"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Discount Type</span>
                <select
                  value={form.discount_type}
                  onChange={(e) => updateField("discount_type", e.target.value)}
                  className={INPUT_STYLES}
                >
                  {OFFER_DISCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
              <FormInput
                label={form.discount_type === "percentage" ? "Discount (%)" : "Discount ($)"}
                type="number"
                min={0}
                step={form.discount_type === "percentage" ? 1 : 0.01}
                max={form.discount_type === "percentage" ? 100 : undefined}
                value={form.discount_value}
                onChange={(e) => updateField("discount_value", e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Start Date</span>
                <DatePicker
                  className={INPUT_STYLES}
                  value={form.start_date ? dayjs(form.start_date) : null}
                  onChange={(_, ds) => updateField("start_date", ds || "")}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">End Date</span>
                <DatePicker
                  className={INPUT_STYLES}
                  value={form.end_date ? dayjs(form.end_date) : null}
                  onChange={(_, ds) => updateField("end_date", ds || "")}
                  disabledDate={(c) => form.start_date && c && c < dayjs(form.start_date)}
                />
              </label>
            </div>
          </div>
        </SectionCard>

        {/* Scope */}
        <SectionCard title="Scope" description="Which rooms or owners this offer applies to">
          <div className="space-y-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Apply to Room (optional)</span>
              <select
                value={form.room_id}
                onChange={(e) => updateField("room_id", e.target.value)}
                className={INPUT_STYLES}
              >
                <option value="">All / None (site-wide)</option>
                {(rooms || []).map((r) => (
                  <option key={r.id} value={r.id}>{r.title} — {r.location}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Apply to Owner (optional)</span>
              <select
                value={form.owner_id}
                onChange={(e) => updateField("owner_id", e.target.value)}
                className={INPUT_STYLES}
              >
                <option value="">None (site-wide or room-specific)</option>
                {(owners || []).map((o) => (
                  <option key={o.id} value={o.id}>{o.full_name || o.email || "Unknown"}</option>
                ))}
              </select>
            </label>

            <div className="rounded-xl border border-border/50 bg-surface/30 p-3">
              <p className="text-xs text-muted">
                <strong className="text-ink">Scope rules:</strong>{" "}
                If a room is selected, the offer applies only to that room.
                If only an owner is selected, it applies to all their rooms.
                If neither is selected, the offer is site-wide.
              </p>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Status</span>
              <label className="flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={(e) => updateField("is_active", e.target.checked)}
                  className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-ink">Active (visible to guests)</span>
              </label>
            </label>
          </div>
        </SectionCard>

        {/* Banner settings — only when show_banner is on */}
        {form.show_banner && (
          <>
            <SectionCard title="Banner Background" description="Image, color, or gradient settings">
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted">Background Type</span>
                    <select
                      value={form.banner_background_type}
                      onChange={(e) => updateField("banner_background_type", e.target.value)}
                      className={INPUT_STYLES}
                    >
                      {OFFER_BACKGROUND_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted">Text Alignment</span>
                    <select
                      value={form.banner_text_alignment}
                      onChange={(e) => updateField("banner_text_alignment", e.target.value)}
                      className={INPUT_STYLES}
                    >
                      {OFFER_TEXT_ALIGNMENTS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {form.banner_background_type === "image" && (
                  <FormInput
                    label="Banner Image URL"
                    value={form.banner_image}
                    onChange={(e) => updateField("banner_image", e.target.value)}
                    placeholder="https://example.com/campaign-banner.jpg"
                  />
                )}

                {form.banner_background_type === "solid" && (
                  <ColorField
                    label="Background Color"
                    value={form.banner_background_color}
                    onChange={(v) => updateField("banner_background_color", v)}
                  />
                )}

                {form.banner_background_type === "gradient" && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ColorField
                        label="Gradient Start"
                        value={form.banner_gradient_from}
                        onChange={(v) => updateField("banner_gradient_from", v)}
                      />
                      <ColorField
                        label="Gradient End"
                        value={form.banner_gradient_to}
                        onChange={(v) => updateField("banner_gradient_to", v)}
                      />
                    </div>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted">Gradient Direction</span>
                      <select
                        value={form.banner_gradient_direction}
                        onChange={(e) => updateField("banner_gradient_direction", e.target.value)}
                        className={INPUT_STYLES}
                      >
                        {OFFER_GRADIENT_DIRECTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                <RangeField
                  label="Background Opacity"
                  value={form.banner_background_opacity}
                  onChange={(v) => updateField("banner_background_opacity", v)}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>
            </SectionCard>

            <SectionCard title="Text Box Layout" description="Per-device position, width, and drag support">
              <div className="space-y-3">
                {[
                  { key: "desktop", label: "Desktop" },
                  { key: "tablet", label: "Tablet" },
                  { key: "mobile", label: "Mobile" },
                ].map(({ key, label }) => (
                  <div key={key} className="rounded-xl border border-border/50 bg-surface/30 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      {DEVICE_ICONS[key]}
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</p>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      <RangeField
                        label="X Position"
                        value={form[`banner_box_x_${key}`]}
                        onChange={(v) => updateField(`banner_box_x_${key}`, v)}
                        min={0}
                        max={92}
                        step={0.5}
                        suffix="%"
                      />
                      <RangeField
                        label="Y Position"
                        value={form[`banner_box_y_${key}`]}
                        onChange={(v) => updateField(`banner_box_y_${key}`, v)}
                        min={0}
                        max={76}
                        step={0.5}
                        suffix="%"
                      />
                      <RangeField
                        label="Width"
                        value={form[`banner_box_width_${key}`]}
                        onChange={(v) => updateField(`banner_box_width_${key}`, v)}
                        min={key === "mobile" ? 40 : key === "tablet" ? 30 : 24}
                        max={key === "mobile" ? 98 : key === "tablet" ? 94 : 90}
                        step={1}
                        suffix="%"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        )}
      </div>

      {/* Bottom action bar */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="sticky bottom-0 -mx-4 border-t border-border bg-panel/95 px-4 py-3 backdrop-blur-xl dark:bg-dark-navy/95 lg:-mx-6 lg:px-6">
        <div className="flex items-center justify-between">
          <p className="hidden text-xs text-muted sm:block">
            {isNew
              ? "Fill in the details" + (form.show_banner ? " and preview your banner above" : "")
              : "Changes are reflected in the preview instantly"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : isNew ? "Create Offer" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
