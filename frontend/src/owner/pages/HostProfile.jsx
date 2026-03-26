import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOwnerProfile, updateOwnerProfile } from "../../redux/slices/ownerSlice.js";

const RESPONSE_TIME_OPTIONS = [
  { value: "", label: "Select response time" },
  { value: "within minutes", label: "Within minutes" },
  { value: "within an hour", label: "Within an hour" },
  { value: "within a few hours", label: "Within a few hours" },
  { value: "within a day", label: "Within a day" },
];

const SPECIALTY_SUGGESTIONS = [
  "Entire homes", "Pool access", "Pet-friendly", "Beachfront", "Workspace",
  "High-speed Wi-Fi", "Quiet zones", "Event spaces", "Yoga studios",
  "Family spaces", "BBQ areas", "Large groups", "Mountain retreats",
  "Hot tubs", "Scenic views", "Art studios", "Music rooms", "Creative spaces",
  "Gardens", "Urban lofts", "Photo studios", "Meeting spaces",
];

const LANGUAGE_SUGGESTIONS = [
  "English", "Spanish", "French", "German", "Mandarin", "Hindi",
  "Portuguese", "Japanese", "Korean", "Arabic", "Italian", "Russian",
];

const TagInput = React.memo(({ label, value, onChange, suggestions }) => {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = useCallback((tag) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
    setShowSuggestions(false);
  }, [value, onChange]);

  const removeTag = useCallback((tag) => {
    onChange(value.filter((t) => t !== tag));
  }, [value, onChange]);

  const filtered = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <div>
      <label className="text-sm font-medium text-muted dark:text-dark-muted">{label}</label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 text-brand-400 hover:text-brand-600">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
          </span>
        ))}
      </div>
      <div className="relative mt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(input); } }}
          placeholder={`Type to add ${label.toLowerCase()}...`}
          className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink shadow-sm transition placeholder:text-muted/60 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-dark-border dark:bg-dark-panel dark:text-dark-ink dark:placeholder:text-dark-muted/60 dark:focus:border-brand-600 dark:focus:ring-brand-800"
        />
        {showSuggestions && input && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-xl border border-border bg-white shadow-lg dark:border-dark-border dark:bg-dark-panel">
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTag(s)}
                className="block w-full px-4 py-2 text-left text-sm text-ink hover:bg-brand-50 dark:text-dark-ink dark:hover:bg-brand-900/20"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default function OwnerHostProfile() {
  const dispatch = useDispatch();
  const { profile, profileLoading, error } = useSelector((s) => s.owner);

  const [form, setForm] = useState({
    full_name: "", phone: "", bio: "",
    avatar_url: "", cover_photo_url: "",
    languages: [], specialties: [],
    response_time: "", response_rate: 0,
    is_superhost: false, identity_verified: false,
    accepts_cohosts: false,
  });
  const [success, setSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => { dispatch(fetchOwnerProfile()); }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
        cover_photo_url: profile.cover_photo_url || "",
        languages: profile.languages || [],
        specialties: profile.specialties || [],
        response_time: profile.response_time || "",
        response_rate: profile.response_rate || 0,
        is_superhost: profile.is_superhost || false,
        identity_verified: profile.identity_verified || false,
        accepts_cohosts: profile.accepts_cohosts || false,
      });
    }
  }, [profile]);

  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess("");
    setSaveError("");
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSuccess(""); setSaveError("");
    try {
      await dispatch(updateOwnerProfile(form)).unwrap();
      setSuccess("Host profile updated successfully!");
    } catch (err) {
      setSaveError(typeof err === "string" ? err : "Failed to update profile.");
    }
  }, [dispatch, form]);

  if (profileLoading && !profile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted dark:text-dark-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-dark-ink">Host Profile</h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Manage your public host profile. This information is visible to guests browsing hosts.
        </p>
      </div>

      {/* Cover + Avatar Preview */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-dark-border dark:bg-dark-panel">
        <div className="h-40 bg-gradient-to-r from-brand-500 to-brand-400">
          {form.cover_photo_url && (
            <img src={form.cover_photo_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="absolute bottom-4 left-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-brand-100 text-3xl font-bold text-brand-600 shadow-lg dark:border-dark-panel dark:bg-brand-900/50 dark:text-brand-300">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              (form.full_name?.[0] || "H").toUpperCase()
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-panel">
          <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Basic Information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted dark:text-dark-muted">Full Name</label>
              <input type="text" value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-dark-border dark:bg-dark-panel dark:text-dark-ink dark:focus:border-brand-600 dark:focus:ring-brand-800" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted dark:text-dark-muted">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+1 (555) 123-4567" className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-dark-border dark:bg-dark-panel dark:text-dark-ink dark:focus:border-brand-600 dark:focus:ring-brand-800" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-muted dark:text-dark-muted">Bio</label>
              <textarea value={form.bio} onChange={(e) => setField("bio", e.target.value)} rows={4} placeholder="Tell guests about yourself, your hosting style, and what makes your spaces special..." className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-dark-border dark:bg-dark-panel dark:text-dark-ink dark:focus:border-brand-600 dark:focus:ring-brand-800" />
            </div>
          </div>
        </section>

        {/* Photos */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-panel">
          <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Photos</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted dark:text-dark-muted">Avatar URL</label>
              <input type="url" value={form.avatar_url} onChange={(e) => setField("avatar_url", e.target.value)} placeholder="https://..." className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-dark-border dark:bg-dark-panel dark:text-dark-ink dark:focus:border-brand-600 dark:focus:ring-brand-800" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted dark:text-dark-muted">Cover Photo URL</label>
              <input type="url" value={form.cover_photo_url} onChange={(e) => setField("cover_photo_url", e.target.value)} placeholder="https://..." className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-dark-border dark:bg-dark-panel dark:text-dark-ink dark:focus:border-brand-600 dark:focus:ring-brand-800" />
            </div>
          </div>
        </section>

        {/* Languages & Specialties */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-panel">
          <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Languages & Specialties</h2>
          <div className="mt-4 space-y-6">
            <TagInput label="Languages" value={form.languages} onChange={(v) => setField("languages", v)} suggestions={LANGUAGE_SUGGESTIONS} />
            <TagInput label="Specialties" value={form.specialties} onChange={(v) => setField("specialties", v)} suggestions={SPECIALTY_SUGGESTIONS} />
          </div>
        </section>

        {/* Hosting Stats (computed, read-only) */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-panel">
          <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Hosting Stats</h2>
          <p className="mt-1 text-xs text-muted dark:text-dark-muted">
            These values are calculated automatically from your property reviews and profile creation date.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface/40 p-4 text-center dark:border-dark-border dark:bg-dark-surface/40">
              <p className="text-2xl font-bold text-ink dark:text-dark-ink">
                {profile?.rating > 0 ? profile.rating : "—"}
              </p>
              <p className="mt-1 text-xs text-muted dark:text-dark-muted">Rating</p>
            </div>
            <div className="rounded-xl border border-border bg-surface/40 p-4 text-center dark:border-dark-border dark:bg-dark-surface/40">
              <p className="text-2xl font-bold text-ink dark:text-dark-ink">{profile?.review_count || 0}</p>
              <p className="mt-1 text-xs text-muted dark:text-dark-muted">Reviews</p>
            </div>
            <div className="rounded-xl border border-border bg-surface/40 p-4 text-center dark:border-dark-border dark:bg-dark-surface/40">
              <p className="text-2xl font-bold text-ink dark:text-dark-ink">{profile?.years_hosting || 0}</p>
              <p className="mt-1 text-xs text-muted dark:text-dark-muted">Years hosting</p>
            </div>
            <div className="rounded-xl border border-border bg-surface/40 p-4 text-center dark:border-dark-border dark:bg-dark-surface/40">
              <p className="text-2xl font-bold text-ink dark:text-dark-ink">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-muted dark:text-dark-muted">Hosting since</p>
            </div>
          </div>
        </section>

        {/* Hosting Details */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-panel">
          <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Hosting Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted dark:text-dark-muted">Response Time</label>
              <select value={form.response_time} onChange={(e) => setField("response_time", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-dark-border dark:bg-dark-panel dark:text-dark-ink dark:focus:border-brand-600 dark:focus:ring-brand-800">
                {RESPONSE_TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted dark:text-dark-muted">Response Rate (%)</label>
              <input type="number" min={0} max={100} value={form.response_rate} onChange={(e) => setField("response_rate", Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-dark-border dark:bg-dark-panel dark:text-dark-ink dark:focus:border-brand-600 dark:focus:ring-brand-800" />
            </div>
          </div>
        </section>

        {/* Badges & Toggles */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-panel">
          <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Status & Preferences</h2>
          <div className="mt-4 space-y-4">
            {[
              { key: "is_superhost", label: "Superhost", desc: "Display the Superhost badge on your profile" },
              { key: "identity_verified", label: "Identity Verified", desc: "Show identity verification badge" },
              { key: "accepts_cohosts", label: "Open to Co-hosting", desc: "Allow other hosts to inquire about co-hosting opportunities" },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex cursor-pointer items-start gap-4 rounded-xl border border-border p-4 transition hover:border-brand-200 hover:bg-brand-50/30 dark:border-dark-border dark:hover:border-brand-700 dark:hover:bg-brand-900/10">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setField(key, e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-border text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <p className="text-sm font-semibold text-ink dark:text-dark-ink">{label}</p>
                  <p className="text-xs text-muted dark:text-dark-muted">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Messages */}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            {success}
          </div>
        )}
        {(saveError || error) && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
            {saveError || error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={profileLoading}
            className="rounded-xl bg-brand-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-50"
          >
            {profileLoading ? "Saving..." : "Save Host Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
