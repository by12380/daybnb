import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "antd";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../guest/components/ui/Button.jsx";
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
  deleteAdminHeroBanner,
  fetchAdminHeroBanners,
  updateAdminHeroBanner,
} from "../../redux/slices/heroBannerSlice.js";

function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = "",
}) {
  return (
    <label className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span className="text-xs font-semibold text-ink">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="accent-brand-600"
      />
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-muted">{label}</span>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-panel px-3 py-2 shadow-sm">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
        />
      </div>
    </label>
  );
}

const HeroBannerFormModal = React.memo(function HeroBannerFormModal({
  open,
  banner,
  isNew,
  onClose,
  onSave,
}) {
  const dispatch = useDispatch();
  const previewRef = useRef(null);
  const dragStateRef = useRef(null);
  const [form, setForm] = useState(HERO_BANNER_DEFAULTS);
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(normalizeHeroBanner(banner || HERO_BANNER_DEFAULTS));
    setPreviewDevice("desktop");
    setSaving(false);
    setError("");
  }, [banner, open]);

  useEffect(() => {
    return () => {
      if (dragStateRef.current) {
        window.removeEventListener("pointermove", dragStateRef.current.onMove);
        window.removeEventListener("pointerup", dragStateRef.current.onUp);
      }
    };
  }, []);

  const updateField = useCallback((field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
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

      const onMove = (moveEvent) => {
        const nextLeftPx = moveEvent.clientX - rect.left - pointerOffsetX;
        const nextTopPx = moveEvent.clientY - rect.top - pointerOffsetY;
        const leftPercent = Math.min(
          Math.max((nextLeftPx / rect.width) * 100, 0),
          maxLeftPercent
        );
        const topPercent = Math.min(
          Math.max((nextTopPx / rect.height) * 100, 0),
          76
        );

        setForm((current) => ({
          ...current,
          box_x: Number(leftPercent.toFixed(2)),
          box_y: Number(topPercent.toFixed(2)),
        }));
      };

      const onUp = () => {
        stopDragging();
      };

      dragStateRef.current = { onMove, onUp };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [form, previewDevice, stopDragging]
  );

  const normalizedForm = useMemo(() => normalizeHeroBanner(form), [form]);
  const previewFrame = useMemo(
    () => getHeroPreviewFrame(previewDevice),
    [previewDevice]
  );

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

    if (
      normalizedForm.background_type === "image" &&
      !normalizedForm.background_image.trim()
    ) {
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
        box_x: Number(normalizedForm.box_x),
        box_y: Number(normalizedForm.box_y),
        box_width_desktop: Number(normalizedForm.box_width_desktop),
        box_width_tablet: Number(normalizedForm.box_width_tablet),
        box_width_mobile: Number(normalizedForm.box_width_mobile),
        sort_order: Number(normalizedForm.sort_order),
      };

      if (isNew) {
        await dispatch(createAdminHeroBanner(payload)).unwrap();
      } else {
        await dispatch(
          updateAdminHeroBanner({ id: banner.id, ...payload })
        ).unwrap();
      }

      onSave();
    } catch (err) {
      setError(err || `Failed to ${isNew ? "create" : "update"} hero banner.`);
    } finally {
      setSaving(false);
    }
  }, [banner?.id, cleanText, dispatch, isNew, normalizedForm, onSave]);

  return (
    <Modal
      title={isNew ? "Create Hero Banner" : "Edit Hero Banner"}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={1100}
    >
      <div className="grid max-h-[78vh] gap-6 overflow-y-auto pt-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,420px)]">
        <div className="space-y-5 pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Banner Title"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Plan the perfect stay"
            />
            <FormInput
              label="Badge Text (optional)"
              value={form.badge_text}
              onChange={(event) => updateField("badge_text", event.target.value)}
              placeholder="Featured"
            />
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Subtitle</span>
            <textarea
              value={form.subtitle}
              onChange={(event) => updateField("subtitle", event.target.value)}
              placeholder="Add supporting copy for the banner."
              rows={4}
              className={`${INPUT_STYLES} min-h-[110px] resize-y`}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="CTA Text (optional)"
              value={form.cta_text}
              onChange={(event) => updateField("cta_text", event.target.value)}
              placeholder="Start searching"
            />
            <FormInput
              label="CTA Link (optional)"
              value={form.cta_link}
              onChange={(event) => updateField("cta_link", event.target.value)}
              placeholder="/rooms or #search"
            />
          </div>

          <div className="rounded-2xl border border-border bg-surface/40 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted">Background Type</span>
                <select
                  value={form.background_type}
                  onChange={(event) => updateField("background_type", event.target.value)}
                  className={INPUT_STYLES}
                >
                  {HERO_BACKGROUND_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted">Text Alignment</span>
                <select
                  value={form.text_alignment}
                  onChange={(event) => updateField("text_alignment", event.target.value)}
                  className={INPUT_STYLES}
                >
                  {HERO_TEXT_ALIGNMENTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 space-y-4">
              {form.background_type === "image" ? (
                <FormInput
                  label="Background Image URL"
                  value={form.background_image}
                  onChange={(event) => updateField("background_image", event.target.value)}
                  placeholder="https://example.com/hero.jpg"
                />
              ) : null}

              {form.background_type === "solid" ? (
                <ColorField
                  label="Background Color"
                  value={form.background_color}
                  onChange={(value) => updateField("background_color", value)}
                />
              ) : null}

              {form.background_type === "gradient" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorField
                    label="Gradient Start"
                    value={form.gradient_from}
                    onChange={(value) => updateField("gradient_from", value)}
                  />
                  <ColorField
                    label="Gradient End"
                    value={form.gradient_to}
                    onChange={(value) => updateField("gradient_to", value)}
                  />
                  <label className="flex flex-col gap-2 sm:col-span-2">
                    <span className="text-sm font-medium text-muted">Gradient Direction</span>
                    <select
                      value={form.gradient_direction}
                      onChange={(event) => updateField("gradient_direction", event.target.value)}
                      className={INPUT_STYLES}
                    >
                      {HERO_GRADIENT_DIRECTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <RangeField
                label="Background Opacity"
                value={form.background_opacity}
                onChange={(value) => updateField("background_opacity", value)}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Text Box Layout</p>
                <p className="text-xs text-muted">
                  Drag the text box in the preview, then fine-tune the responsive width below.
                </p>
              </div>
              <div className="inline-flex rounded-full border border-border bg-panel p-1">
                {HERO_PREVIEW_DEVICES.map((device) => (
                  <button
                    key={device.value}
                    type="button"
                    onClick={() => setPreviewDevice(device.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      previewDevice === device.value
                        ? "bg-brand-600 text-white"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {device.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <RangeField
                label="Horizontal Position"
                value={form.box_x}
                onChange={(value) => updateField("box_x", value)}
                min={0}
                max={92}
                step={0.5}
                suffix="%"
              />
              <RangeField
                label="Vertical Position"
                value={form.box_y}
                onChange={(value) => updateField("box_y", value)}
                min={0}
                max={76}
                step={0.5}
                suffix="%"
              />
              <RangeField
                label="Desktop Width"
                value={form.box_width_desktop}
                onChange={(value) => updateField("box_width_desktop", value)}
                min={24}
                max={90}
                step={1}
                suffix="%"
              />
              <RangeField
                label="Tablet Width"
                value={form.box_width_tablet}
                onChange={(value) => updateField("box_width_tablet", value)}
                min={30}
                max={94}
                step={1}
                suffix="%"
              />
              <RangeField
                label="Mobile Width"
                value={form.box_width_mobile}
                onChange={(value) => updateField("box_width_mobile", value)}
                min={40}
                max={98}
                step={1}
                suffix="%"
              />
              <FormInput
                label="Sort Order"
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(event) => updateField("sort_order", event.target.value)}
              />
            </div>

            <label className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.is_active}
                onChange={(event) => updateField("is_active", event.target.checked)}
                className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-muted">Show this banner on the landing page</span>
            </label>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : isNew ? "Create Banner" : "Save Changes"}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-ink">Live Preview</p>
            <p className="text-xs text-muted">
              This preview updates instantly and uses a fixed frame ratio for the selected device.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-surface/50 p-4">
            <div
              className="mx-auto transition-all duration-200"
              style={{ maxWidth: `${previewFrame.width}px` }}
            >
              <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                {previewDevice} preview | {previewFrame.label}
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
    </Modal>
  );
});

function statusBadge(isActive) {
  return isActive
    ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

export default function AdminHeroBanners() {
  const dispatch = useDispatch();
  const { adminBanners, loading } = useSelector((state) => state.heroBanners);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    dispatch(fetchAdminHeroBanners());
  }, [dispatch]);

  const sortedBanners = useMemo(
    () =>
      [...(adminBanners || [])].sort((a, b) => {
        if ((a.sort_order || 0) !== (b.sort_order || 0)) {
          return (a.sort_order || 0) - (b.sort_order || 0);
        }
        return String(b.created_at || "").localeCompare(String(a.created_at || ""));
      }),
    [adminBanners]
  );

  const refreshAfterSave = useCallback(() => {
    setEditingBanner(null);
    setIsCreating(false);
    dispatch(fetchAdminHeroBanners());
  }, [dispatch]);

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("Delete this hero banner?")) return;
      await dispatch(deleteAdminHeroBanner(id));
      dispatch(fetchAdminHeroBanners());
    },
    [dispatch]
  );

  const handleToggleActive = useCallback(
    async (banner) => {
      await dispatch(
        updateAdminHeroBanner({
          id: banner.id,
          is_active: !banner.is_active,
        })
      );
      dispatch(fetchAdminHeroBanners());
    },
    [dispatch]
  );

  if (loading && (!adminBanners || adminBanners.length === 0)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading hero banners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Hero Banners</h1>
          <p className="mt-1 text-sm text-muted">
            Manage the landing page slider with responsive text placement and live preview.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Create Banner
        </Button>
      </div>

      {sortedBanners.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel py-12 text-center shadow-sm">
          <svg
            className="mx-auto h-12 w-12 text-muted/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2 1.586-1.586a2 2 0 012.828 0L20 14m-6-8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-ink">No hero banners yet</p>
          <p className="mt-1 text-sm text-muted">
            If you leave this empty, the current landing hero stays exactly as it is.
          </p>
          <div className="mt-4">
            <Button onClick={() => setIsCreating(true)}>Create Banner</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {sortedBanners.map((banner) => (
            <div
              key={banner.id}
              className="overflow-hidden rounded-3xl border border-border bg-panel shadow-sm"
            >
              <div className="p-4">
                <HeroBannerCanvas
                  banner={banner}
                  preview
                  className="min-h-[240px] sm:min-h-[280px]"
                />
              </div>
              <div className="border-t border-border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-ink">{banner.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(
                          banner.is_active
                        )}`}
                      >
                        {banner.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      Sort order: {banner.sort_order || 0} | Text box:{" "}
                      {Math.round(Number(banner.box_x || 0))}% /{" "}
                      {Math.round(Number(banner.box_y || 0))}%
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setEditingBanner(banner)}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(banner)}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600"
                    >
                      {banner.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <HeroBannerFormModal
        open={!!editingBanner || isCreating}
        banner={editingBanner}
        isNew={isCreating}
        onClose={() => {
          setEditingBanner(null);
          setIsCreating(false);
        }}
        onSave={refreshAfterSave}
      />
    </div>
  );
}
