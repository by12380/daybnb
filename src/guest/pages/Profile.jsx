import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { useAuth } from "../../auth/useAuth.js";
import { supabase } from "../../lib/supabaseClient.js";

const PROFILES_TABLE = "profiles";

const Profile = React.memo(() => {
  const { user } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const createdAtText = useMemo(() => {
    if (!user?.created_at) return "";
    try {
      return new Date(user.created_at).toLocaleString();
    } catch {
      return String(user.created_at);
    }
  }, [user?.created_at]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setError("");
      setSuccess("");

      if (!supabase) {
        setError(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        );
        return;
      }
      if (!user?.id) return;

      setProfileLoading(true);
      const { data, error: fetchError } = await supabase
        .from(PROFILES_TABLE)
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        const hint =
          fetchError?.message?.toLowerCase?.().includes("does not exist") ||
          fetchError?.message?.toLowerCase?.().includes("not found")
            ? `\n\nCreate a \`${PROFILES_TABLE}\` table in Supabase (see SQL below).`
            : fetchError?.message?.toLowerCase?.().includes("row level security") ||
                fetchError?.message?.toLowerCase?.().includes("rls")
              ? `\n\nIf RLS is enabled, add a SELECT policy to \`${PROFILES_TABLE}\` for authenticated users limited to their own row.`
              : "";
        setError(`${fetchError.message || "Failed to load profile."}${hint}`);
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfile(data || null);

      // Populate form fields from table (fallback to auth metadata for convenience).
      const nameFallback = user?.user_metadata?.full_name || "";
      const phoneFallback = user?.phone || user?.user_metadata?.phone || "";
      setFullName(String(data?.full_name ?? nameFallback ?? ""));
      setPhone(String(data?.phone ?? phoneFallback ?? ""));
      setGender(String(data?.gender ?? ""));
      setAddressLine1(String(data?.address_line1 ?? ""));
      setAddressLine2(String(data?.address_line2 ?? ""));
      setCity(String(data?.city ?? ""));
      setStateRegion(String(data?.state_region ?? ""));
      setPostalCode(String(data?.postal_code ?? ""));
      setCountry(String(data?.country ?? ""));

      setProfileLoading(false);
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const onSave = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      setSuccess("");

      if (!supabase) {
        setError(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        );
        return;
      }

      if (!user?.id) {
        setError("Not signed in.");
        return;
      }

      setSaving(true);
      const payload = {
        id: user.id,
        email: user.email ?? null,
        full_name: fullName?.trim() || null,
        phone: phone?.trim() || null,
        gender: gender || null,
        address_line1: addressLine1?.trim() || null,
        address_line2: addressLine2?.trim() || null,
        city: city?.trim() || null,
        state_region: stateRegion?.trim() || null,
        postal_code: postalCode?.trim() || null,
        country: country?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data: upserted, error: upsertError } = await supabase
        .from(PROFILES_TABLE)
        .upsert(payload, { onConflict: "id" })
        .select("*")
        .maybeSingle();

      if (upsertError) {
        const hint =
          upsertError?.message?.toLowerCase?.().includes("row level security") ||
          upsertError?.message?.toLowerCase?.().includes("rls")
            ? `\n\nIf RLS is enabled, add an INSERT/UPDATE policy to \`${PROFILES_TABLE}\` for authenticated users limited to their own row.`
            : "";
        setError(`${upsertError.message || "Failed to update profile."}${hint}`);
        setSaving(false);
        return;
      }

      // Keep auth metadata in sync (so booking forms can prefill).
      await supabase.auth.updateUser({
        data: {
          full_name: fullName?.trim() || null,
          phone: phone?.trim() || null,
        },
      });

      setSaving(false);
      setProfile(upserted || payload);
      setSuccess("Profile updated.");
    },
    [
      addressLine1,
      addressLine2,
      city,
      country,
      fullName,
      gender,
      phone,
      postalCode,
      stateRegion,
      user?.email,
      user?.id,
    ]
  );

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 md:grid-cols-3">
      <Card className="md:col-span-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Profile</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Your details</h1>
        <p className="mt-2 text-sm text-muted">
          View and update the profile info used during bookings.
        </p>
        <div className="mt-6 space-y-2 text-sm text-muted">
          <p>
            <span className="font-medium text-ink">Email:</span> {user?.email || "—"}
          </p>
          <p>
            <span className="font-medium text-ink">User ID:</span>{" "}
            <span className="break-all">{user?.id || "—"}</span>
          </p>
          {createdAtText ? (
            <p>
              <span className="font-medium text-ink">Created:</span> {createdAtText}
            </p>
          ) : null}
          {profile?.updated_at ? (
            <p>
              <span className="font-medium text-ink">Updated:</span>{" "}
              {new Date(profile.updated_at).toLocaleString()}
            </p>
          ) : null}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/my-bookings">
            <Button variant="outline">My bookings</Button>
          </Link>
          <Link to="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>
      </Card>

      <Card className="md:col-span-2">
        <form className="space-y-4" onSubmit={onSave} noValidate>
          {profileLoading ? (
            <div className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-muted">
              Loading profile…
            </div>
          ) : null}

          <FormInput
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ada Lovelace"
            autoComplete="name"
          />
          <FormInput
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            autoComplete="tel"
          />

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Gender</span>
            <select
              className={INPUT_STYLES}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput
              label="Address line 1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="123 Main St"
              autoComplete="address-line1"
            />
            <FormInput
              label="Address line 2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Apt, suite, etc."
              autoComplete="address-line2"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Austin"
              autoComplete="address-level2"
            />
            <FormInput
              label="State / Region"
              value={stateRegion}
              onChange={(e) => setStateRegion(e.target.value)}
              placeholder="TX"
              autoComplete="address-level1"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput
              label="Postal code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="78701"
              autoComplete="postal-code"
            />
            <FormInput
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="United States"
              autoComplete="country-name"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
              {success}
            </div>
          ) : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFullName(String(profile?.full_name ?? user?.user_metadata?.full_name ?? ""));
                setPhone(String(profile?.phone ?? user?.phone ?? user?.user_metadata?.phone ?? ""));
                setGender(String(profile?.gender ?? ""));
                setAddressLine1(String(profile?.address_line1 ?? ""));
                setAddressLine2(String(profile?.address_line2 ?? ""));
                setCity(String(profile?.city ?? ""));
                setStateRegion(String(profile?.state_region ?? ""));
                setPostalCode(String(profile?.postal_code ?? ""));
                setCountry(String(profile?.country ?? ""));
                setError("");
                setSuccess("");
              }}
            >
              Reset
            </Button>
          </div>

        </form>
      </Card>
    </div>
  );
});

export default Profile;

