import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import HeroBannerCanvas from "../../components/HeroBannerCanvas.jsx";
import {
  HERO_BACKGROUND_TYPES,
  HERO_BANNER_DEFAULTS,
  HERO_GRADIENT_DIRECTIONS,
  HERO_PREVIEW_DEVICES,
  HERO_TEXT_ALIGNMENTS,
  clampHeroBoxPosition,
  getHeroBoxWidthPercent,
  getHeroPreviewFrame,
  normalizeHeroBanner,
} from "../../lib/heroBanner.js";
import {
  createAdminHeroBanner,
  fetchAdminHeroBanners,
  updateAdminHeroBanner,
} from "../../redux/slices/heroBannerSlice.js";

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

export default function HeroBannerEditor() {
  const { bannerId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { adminBanners, loading: storeLoading } = useSelector((s) => s.heroBanners);

  const isNew = !bannerId || bannerId === "new";
  const existingBanner = useMemo(
    () => (isNew ? null : adminBanners.find((b) => b.id === bannerId)),
    [adminBanners, bannerId, isNew]
  );

  const previewRef = useRef(null);
  const dragStateRef = useRef(null);
  const [form, setForm] = useState(HERO_BANNER_DEFAULTS);
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!adminBanners.length && !storeLoading) {
      dispatch(fetchAdminHeroBanners());
    }
  }, [adminBanners.length, dispatch, storeLoading]);

  useEffect(() => {
    if (loaded) return;
    if (isNew) {
      setForm(normalizeHeroBanner(HERO_BANNER_DEFAULTS));
      setLoaded(true);
    } else if (existingBanner) {
      setForm(normalizeHeroBanner(existingBanner));
      setLoaded(true);
    }
  }, [existingBanner, isNew, loaded]);

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
      const widthPercent = getHeroBoxWidthPercent(form, previewDevice);
      const position = clampHeroBoxPosition(form, previewDevice);
      const boxLeft = (rect.width * position.left) / 100;
      const boxTop = (rect.height * position.top) / 100;
      const pointerOffsetX = event.clientX - rect.left - boxLeft;
      const pointerOffsetY = event.clientY - rect.top - boxTop;
      const maxLeftPercent = Math.max(0, 100 - widthPercent);

      stopDragging();

      const xField = `box_x_${previewDevice}`;
      const yField = `box_y_${previewDevice}`;

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
    [form, previewDevice, stopDragging]
  );

  const normalizedForm = useMemo(() => normalizeHeroBanner(form), [form]);
  const previewFrame = useMemo(() => getHeroPreviewFrame(previewDevice), [previewDevice]);

  const cleanText = useCallback((value) => {
    if (value === null || value === undefined) return null;
    const next = String(value).trim();
    return next || null;
  }, []);

  const handleSave = useCallback(async () => {
    setError("");
    if (!normalizedForm.title.trim()) {
      setError("Banner title is required.");
      return;
    }
    if (normalizedForm.background_type === "image" && !normalizedForm.background_image.trim()) {
      setError("Background image URL is required for image banners.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...normalizedForm,
        title: String(normalizedForm.title || "").trim(),
        subtitle: cleanText(normalizedForm.subtitle),
        badge_text: cleanText(normalizedForm.badge_text),
        cta_text: cleanText(normalizedForm.cta_text),
        cta_link: cleanText(normalizedForm.cta_link),
        background_image: cleanText(normalizedForm.background_image),
        background_color: cleanText(normalizedForm.background_color),
        gradient_from: cleanText(normalizedForm.gradient_from),
        gradient_to: cleanText(normalizedForm.gradient_to),
        background_opacity: Number(normalizedForm.background_opacity),
        box_x_desktop: Number(normalizedForm.box_x_desktop),
        box_y_desktop: Number(normalizedForm.box_y_desktop),
        box_x_tablet: Number(normalizedForm.box_x_tablet),
        box_y_tablet: Number(normalizedForm.box_y_tablet),
        box_x_mobile: Number(normalizedForm.box_x_mobile),
        box_y_mobile: Number(normalizedForm.box_y_mobile),
        box_width_desktop: Number(normalizedForm.box_width_desktop),
        box_width_tablet: Number(normalizedForm.box_width_tablet),
        box_width_mobile: Number(normalizedForm.box_width_mobile),
        sort_order: Number(normalizedForm.sort_order),
      };

      if (isNew) {
        await dispatch(createAdminHeroBanner(payload)).unwrap();
      } else {
        await dispatch(updateAdminHeroBanner({ id: bannerId, ...payload })).unwrap();
      }
      navigate("/admin/hero-banners");
    } catch (err) {
      setError(err || `Failed to ${isNew ? "create" : "update"} hero banner.`);
    } finally {
      setSaving(false);
    }
  }, [bannerId, cleanText, dispatch, isNew, navigate, normalizedForm]);

  const handleCancel = useCallback(() => {
    navigate("/admin/hero-banners");
  }, [navigate]);

  if (!isNew && !existingBanner && storeLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading banner...</p>
        </div>
      </div>
    );
  }

  if (!isNew && !existingBanner && !storeLoading && adminBanners.length > 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted">Banner not found.</p>
        <Button variant="outline" onClick={handleCancel}>Back to Hero Banners</Button>
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
              {isNew ? "Create Hero Banner" : "Edit Hero Banner"}
            </h1>
            <p className="text-xs text-muted">
              {isNew ? "Design a new banner for the landing page" : `Editing: ${existingBanner?.title || "Banner"}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Create Banner" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Preview section */}
      <div className="mb-6">
        <div className="rounded-2xl border border-border bg-panel/80 p-4 shadow-lg backdrop-blur-sm">
          {/* Device switcher */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted">Preview</span>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Live
              </span>
            </div>
            <div className="inline-flex rounded-xl border border-border bg-surface/60 p-1">
              {HERO_PREVIEW_DEVICES.map((device) => (
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
              <HeroBannerCanvas
                banner={normalizedForm}
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

      {/* Form controls */}
      <div className="grid gap-5 pb-8 lg:grid-cols-2 xl:grid-cols-3">
        {/* Content section */}
        <SectionCard title="Content" description="Banner text and call-to-action">
          <div className="space-y-3">
            <FormInput
              label="Banner Title"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Plan the perfect stay"
            />
            <FormInput
              label="Badge Text (optional)"
              value={form.badge_text}
              onChange={(e) => updateField("badge_text", e.target.value)}
              placeholder="Featured"
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Subtitle</span>
              <textarea
                value={form.subtitle}
                onChange={(e) => updateField("subtitle", e.target.value)}
                placeholder="Add supporting copy for the banner."
                rows={3}
                className={`${INPUT_STYLES} min-h-[80px] resize-y`}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormInput
                label="CTA Text (optional)"
                value={form.cta_text}
                onChange={(e) => updateField("cta_text", e.target.value)}
                placeholder="Start searching"
              />
              <FormInput
                label="CTA Link (optional)"
                value={form.cta_link}
                onChange={(e) => updateField("cta_link", e.target.value)}
                placeholder="/rooms or #search"
              />
            </div>
          </div>
        </SectionCard>

        {/* Background section */}
        <SectionCard title="Background" description="Image, color, or gradient settings">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Background Type</span>
                <select
                  value={form.background_type}
                  onChange={(e) => updateField("background_type", e.target.value)}
                  className={INPUT_STYLES}
                >
                  {HERO_BACKGROUND_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Text Alignment</span>
                <select
                  value={form.text_alignment}
                  onChange={(e) => updateField("text_alignment", e.target.value)}
                  className={INPUT_STYLES}
                >
                  {HERO_TEXT_ALIGNMENTS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {form.background_type === "image" && (
              <FormInput
                label="Background Image URL"
                value={form.background_image}
                onChange={(e) => updateField("background_image", e.target.value)}
                placeholder="https://example.com/hero.jpg"
              />
            )}

            {form.background_type === "solid" && (
              <ColorField
                label="Background Color"
                value={form.background_color}
                onChange={(v) => updateField("background_color", v)}
              />
            )}

            {form.background_type === "gradient" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ColorField
                    label="Gradient Start"
                    value={form.gradient_from}
                    onChange={(v) => updateField("gradient_from", v)}
                  />
                  <ColorField
                    label="Gradient End"
                    value={form.gradient_to}
                    onChange={(v) => updateField("gradient_to", v)}
                  />
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted">Gradient Direction</span>
                  <select
                    value={form.gradient_direction}
                    onChange={(e) => updateField("gradient_direction", e.target.value)}
                    className={INPUT_STYLES}
                  >
                    {HERO_GRADIENT_DIRECTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <RangeField
              label="Background Opacity"
              value={form.background_opacity}
              onChange={(v) => updateField("background_opacity", v)}
              min={0}
              max={1}
              step={0.05}
            />
          </div>
        </SectionCard>

        {/* Layout section */}
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
                    value={form[`box_x_${key}`]}
                    onChange={(v) => updateField(`box_x_${key}`, v)}
                    min={0}
                    max={92}
                    step={0.5}
                    suffix="%"
                  />
                  <RangeField
                    label="Y Position"
                    value={form[`box_y_${key}`]}
                    onChange={(v) => updateField(`box_y_${key}`, v)}
                    min={0}
                    max={76}
                    step={0.5}
                    suffix="%"
                  />
                  <RangeField
                    label="Width"
                    value={form[`box_width_${key}`]}
                    onChange={(v) => updateField(`box_width_${key}`, v)}
                    min={key === "mobile" ? 40 : key === "tablet" ? 30 : 24}
                    max={key === "mobile" ? 98 : key === "tablet" ? 94 : 90}
                    step={1}
                    suffix="%"
                  />
                </div>
              </div>
            ))}

            <div className="grid gap-3 sm:grid-cols-2">
              <FormInput
                label="Sort Order"
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => updateField("sort_order", e.target.value)}
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Visibility</span>
                <label className="flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={!!form.is_active}
                    onChange={(e) => updateField("is_active", e.target.checked)}
                    className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-ink">Show on landing page</span>
                </label>
              </label>
            </div>
          </div>
        </SectionCard>
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
            {isNew ? "Fill in the details and preview your banner above" : "Changes are reflected in the preview instantly"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : isNew ? "Create Banner" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
