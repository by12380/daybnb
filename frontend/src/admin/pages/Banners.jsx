import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../../redux/api.js";
import { supabase } from "../../lib/supabaseClient.js";

const DEFAULT_BANNER = {
  title: "",
  subtitle: "",
  cta_text: "",
  cta_link: "",
  bg_type: "color",
  bg_image_url: "",
  bg_color: "#4f46e5",
  bg_gradient: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
  bg_opacity: 1.0,
  text_box_x: 5,
  text_box_y: 25,
  text_box_width: 45,
  text_color: "#ffffff",
  is_active: true,
};

const GRADIENT_PRESETS = [
  "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
  "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
  "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
  "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
  "linear-gradient(90deg, #0f172a 0%, #1e3a5f 100%)",
  "linear-gradient(135deg, #f97316 0%, #ec4899 100%)",
];

// ─── Live Preview ──────────────────────────────────────────────
const BannerPreview = React.memo(({ banner, onDrag, onDragEnd, isEditable }) => {
  const containerRef = useRef(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const bgStyle = {};
  if (banner.bg_type === "image" && banner.bg_image_url) {
    bgStyle.backgroundImage = `url(${banner.bg_image_url})`;
    bgStyle.backgroundSize = "cover";
    bgStyle.backgroundPosition = "center";
  } else if (banner.bg_type === "gradient") {
    bgStyle.backgroundImage = banner.bg_gradient;
  } else {
    bgStyle.backgroundColor = banner.bg_color;
  }

  const handleMouseDown = useCallback((e) => {
    if (!isEditable) return;
    e.preventDefault();
    dragging.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    const textBoxPxX = (banner.text_box_x / 100) * rect.width;
    const textBoxPxY = (banner.text_box_y / 100) * rect.height;
    offset.current = { x: e.clientX - rect.left - textBoxPxX, y: e.clientY - rect.top - textBoxPxY };
  }, [isEditable, banner.text_box_x, banner.text_box_y]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left - offset.current.x) / rect.width) * 100;
    let y = ((e.clientY - rect.top - offset.current.y) / rect.height) * 100;
    x = Math.max(0, Math.min(100 - banner.text_box_width, x));
    y = Math.max(0, Math.min(90, y));
    onDrag?.(x, y);
  }, [banner.text_box_width, onDrag]);

  const handleMouseUp = useCallback(() => {
    if (dragging.current) {
      dragging.current = false;
      onDragEnd?.();
    }
  }, [onDragEnd]);

  const handleTouchStart = useCallback((e) => {
    if (!isEditable) return;
    const touch = e.touches[0];
    dragging.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    const textBoxPxX = (banner.text_box_x / 100) * rect.width;
    const textBoxPxY = (banner.text_box_y / 100) * rect.height;
    offset.current = { x: touch.clientX - rect.left - textBoxPxX, y: touch.clientY - rect.top - textBoxPxY };
  }, [isEditable, banner.text_box_x, banner.text_box_y]);

  const handleTouchMove = useCallback((e) => {
    if (!dragging.current || !containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    let x = ((touch.clientX - rect.left - offset.current.x) / rect.width) * 100;
    let y = ((touch.clientY - rect.top - offset.current.y) / rect.height) * 100;
    x = Math.max(0, Math.min(100 - banner.text_box_width, x));
    y = Math.max(0, Math.min(90, y));
    onDrag?.(x, y);
  }, [banner.text_box_width, onDrag]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl border border-border"
      style={{ aspectRatio: "16/6" }}
    >
      {/* Background layer with opacity */}
      <div className="absolute inset-0" style={{ ...bgStyle, opacity: banner.bg_opacity }} />

      {/* Text box */}
      <div
        className={`absolute select-none ${isEditable ? "cursor-grab active:cursor-grabbing ring-2 ring-white/50 ring-dashed" : ""}`}
        style={{
          left: `${banner.text_box_x}%`,
          top: `${banner.text_box_y}%`,
          width: `${banner.text_box_width}%`,
          color: banner.text_color,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {banner.title && (
          <h2 className="text-xl font-bold leading-tight sm:text-2xl lg:text-3xl drop-shadow-lg">
            {banner.title}
          </h2>
        )}
        {banner.subtitle && (
          <p className="mt-2 text-sm leading-snug opacity-90 sm:text-base drop-shadow">
            {banner.subtitle}
          </p>
        )}
        {banner.cta_text && (
          <div className="mt-3">
            <span className="inline-block rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold backdrop-blur sm:text-sm">
              {banner.cta_text}
            </span>
          </div>
        )}
        {isEditable && !banner.title && !banner.subtitle && (
          <span className="text-xs opacity-60">Drag this box</span>
        )}
      </div>
    </div>
  );
});

// ─── Image Upload ──────────────────────────────────────────────
function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(async (file) => {
    if (!supabase) throw new Error("Supabase not configured");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `banners/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("banners")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("banners").getPublicUrl(path);
      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading };
}

// ─── Editor Form ───────────────────────────────────────────────
const BannerEditor = ({ banner, onChange, onSave, onCancel, saving }) => {
  const { upload, uploading } = useImageUpload();
  const fileRef = useRef(null);

  const set = (key, val) => onChange({ ...banner, [key]: val });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await upload(file);
      onChange({ ...banner, bg_type: "image", bg_image_url: url });
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Text fields ── */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-ink">Text Content</legend>
        <input
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-400"
          placeholder="Title"
          value={banner.title}
          onChange={(e) => set("title", e.target.value)}
        />
        <textarea
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-400"
          placeholder="Subtitle"
          rows={2}
          value={banner.subtitle}
          onChange={(e) => set("subtitle", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-400"
            placeholder="CTA button text"
            value={banner.cta_text}
            onChange={(e) => set("cta_text", e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-400"
            placeholder="CTA link (#search, /contact…)"
            value={banner.cta_link}
            onChange={(e) => set("cta_link", e.target.value)}
          />
        </div>
      </fieldset>

      {/* ── Background ── */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-ink">Background</legend>
        <div className="flex gap-2">
          {["color", "gradient", "image"].map((t) => (
            <button
              key={t}
              onClick={() => set("bg_type", t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                banner.bg_type === t
                  ? "bg-brand-600 text-white"
                  : "bg-surface text-muted hover:bg-brand-50 hover:text-brand-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {banner.bg_type === "color" && (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={banner.bg_color}
              onChange={(e) => set("bg_color", e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-border"
            />
            <input
              className="w-28 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink"
              value={banner.bg_color}
              onChange={(e) => set("bg_color", e.target.value)}
            />
          </div>
        )}

        {banner.bg_type === "gradient" && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {GRADIENT_PRESETS.map((g) => (
                <button
                  key={g}
                  onClick={() => set("bg_gradient", g)}
                  className={`h-8 w-14 rounded-lg border-2 transition ${
                    banner.bg_gradient === g ? "border-brand-500 ring-2 ring-brand-300" : "border-transparent"
                  }`}
                  style={{ backgroundImage: g }}
                />
              ))}
            </div>
            <input
              className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink font-mono"
              placeholder="Custom CSS gradient"
              value={banner.bg_gradient}
              onChange={(e) => set("bg_gradient", e.target.value)}
            />
          </div>
        )}

        {banner.bg_type === "image" && (
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-xl border border-dashed border-border px-4 py-6 w-full text-center text-sm text-muted hover:border-brand-400 hover:text-brand-600 transition disabled:opacity-50"
            >
              {uploading ? "Uploading…" : banner.bg_image_url ? "Change image" : "Click to upload image"}
            </button>
            {banner.bg_image_url && (
              <img src={banner.bg_image_url} alt="" className="h-16 w-auto rounded-lg object-cover" />
            )}
            <input
              className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink"
              placeholder="Or paste image URL"
              value={banner.bg_image_url}
              onChange={(e) => set("bg_image_url", e.target.value)}
            />
          </div>
        )}
      </fieldset>

      {/* ── Appearance ── */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-ink">Appearance</legend>

        <div className="flex items-center gap-4">
          <label className="text-xs text-muted w-24">Text Color</label>
          <input type="color" value={banner.text_color} onChange={(e) => set("text_color", e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-border" />
          <input className="w-20 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink" value={banner.text_color} onChange={(e) => set("text_color", e.target.value)} />
        </div>

        <div className="flex items-center gap-4">
          <label className="text-xs text-muted w-24">BG Opacity</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={banner.bg_opacity}
            onChange={(e) => set("bg_opacity", parseFloat(e.target.value))}
            className="flex-1 accent-brand-600"
          />
          <span className="text-xs text-muted w-10 text-right">{Math.round(banner.bg_opacity * 100)}%</span>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-xs text-muted w-24">Box Width</label>
          <input
            type="range"
            min="15"
            max="90"
            step="1"
            value={banner.text_box_width}
            onChange={(e) => set("text_box_width", parseFloat(e.target.value))}
            className="flex-1 accent-brand-600"
          />
          <span className="text-xs text-muted w-10 text-right">{Math.round(banner.text_box_width)}%</span>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={banner.is_active} onChange={(e) => set("is_active", e.target.checked)} className="accent-brand-600" />
            Active (visible on site)
          </label>
        </div>
      </fieldset>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50 transition"
        >
          {saving ? "Saving…" : "Save Banner"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-border px-5 py-2 text-sm font-medium text-muted hover:text-ink transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// ─── Banner Card (list view) ───────────────────────────────────
const BannerCard = ({ banner, index, onEdit, onDelete, onToggle }) => {
  const bgPreview = {};
  if (banner.bg_type === "image" && banner.bg_image_url) {
    bgPreview.backgroundImage = `url(${banner.bg_image_url})`;
    bgPreview.backgroundSize = "cover";
    bgPreview.backgroundPosition = "center";
  } else if (banner.bg_type === "gradient") {
    bgPreview.backgroundImage = banner.bg_gradient;
  } else {
    bgPreview.backgroundColor = banner.bg_color;
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-panel p-3 shadow-sm transition hover:shadow-md">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface text-xs font-bold text-muted">
        {index + 1}
      </span>
      <div
        className="h-16 w-28 flex-shrink-0 rounded-xl border border-border"
        style={{ ...bgPreview, opacity: banner.bg_opacity }}
      />
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-ink text-sm">{banner.title || "(no title)"}</p>
        <p className="truncate text-xs text-muted">{banner.subtitle || "(no subtitle)"}</p>
        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${banner.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
          {banner.is_active ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={() => onToggle(banner)} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink transition" title={banner.is_active ? "Deactivate" : "Activate"}>
          {banner.is_active ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
          )}
        </button>
        <button onClick={() => onEdit(banner)} className="rounded-lg p-1.5 text-muted hover:bg-brand-50 hover:text-brand-600 transition" title="Edit">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
        <button onClick={() => onDelete(banner)} className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600 transition" title="Delete">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────
export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchBanners = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/banners");
      setBanners(data.banners || []);
    } catch (err) {
      console.error("Failed to load banners", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const handleCreate = () => setEditing({ ...DEFAULT_BANNER, _isNew: true });

  const handleEdit = (b) => setEditing({ ...b });

  const handleCancel = () => setEditing(null);

  const handleDrag = useCallback((x, y) => {
    setEditing((prev) => (prev ? { ...prev, text_box_x: x, text_box_y: y } : prev));
  }, []);

  const handleDragEnd = useCallback(() => {}, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = { ...editing };
      delete payload._isNew;
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;

      if (editing._isNew) {
        await api.post("/admin/banners", payload);
      } else {
        await api.put(`/admin/banners/${editing.id}`, payload);
      }
      setEditing(null);
      await fetchBanners();
    } catch (err) {
      alert("Save failed: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b) => {
    if (!confirm(`Delete banner "${b.title || "Untitled"}"?`)) return;
    try {
      await api.delete(`/admin/banners/${b.id}`);
      await fetchBanners();
    } catch (err) {
      alert("Delete failed: " + (err.message || "Unknown error"));
    }
  };

  const handleToggle = async (b) => {
    try {
      await api.put(`/admin/banners/${b.id}`, { is_active: !b.is_active });
      await fetchBanners();
    } catch (err) {
      alert("Toggle failed: " + (err.message || "Unknown error"));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  // ── Editor View ──
  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">{editing._isNew ? "Create Banner" : "Edit Banner"}</h1>
          <button onClick={handleCancel} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-ink transition">
            Back to list
          </button>
        </div>

        {/* Live Preview */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">Live Preview — drag the text box to reposition</p>
          <BannerPreview
            banner={editing}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            isEditable
          />
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
          <BannerEditor
            banner={editing}
            onChange={setEditing}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
          />
        </div>
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Hero Banners</h1>
          <p className="text-sm text-muted">Manage the landing page hero slider. Drag text boxes in the editor to position them.</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Banner
        </button>
      </div>

      {banners.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <svg className="mx-auto h-12 w-12 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <p className="mt-4 text-sm font-medium text-muted">No banners yet</p>
          <p className="mt-1 text-xs text-muted">The landing page will show the default hero section until you create banners.</p>
          <button
            onClick={handleCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
          >
            Create your first banner
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b, i) => (
            <BannerCard
              key={b.id}
              banner={b}
              index={i}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Full-width preview of all active banners */}
      {banners.filter((b) => b.is_active).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">Active Banners Preview</p>
          <div className="space-y-3">
            {banners.filter((b) => b.is_active).map((b) => (
              <BannerPreview key={b.id} banner={b} isEditable={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
