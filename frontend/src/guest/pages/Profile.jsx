import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { useAuth } from "../../auth/useAuth.js";
import {
  getMe,
  updateProfile,
  clearAuthError,
} from "../../redux/slices/authSlice.js";

const GENDER_OPTIONS = [
  { value: "", label: "Select gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const COUNTRY_OPTIONS = [
  { value: "", label: "Select country" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IN", label: "India" },
  { value: "JP", label: "Japan" },
  { value: "OTHER", label: "Other" },
];

const Profile = React.memo(() => {
  const dispatch = useDispatch();
  const { user, loading: authLoading } = useAuth();
  const {
    profile,
    loading,
    error: apiError,
  } = useSelector((state) => state.auth);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  const [success, setSuccess] = useState("");

  // Fetch profile data via API
  useEffect(() => {
    if (user?.id) {
      dispatch(getMe());
    }
  }, [dispatch, user?.id]);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setGender(profile.gender || "");
      setAddressLine1(profile.address_line1 || "");
      setAddressLine2(profile.address_line2 || "");
      setCity(profile.city || "");
      setStateRegion(profile.state_region || "");
      setPostalCode(profile.postal_code || "");
      setCountry(profile.country || "");
    }
  }, [profile]);

  const clearMessages = useCallback(() => {
    setSuccess("");
    dispatch(clearAuthError());
  }, [dispatch]);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setSuccess("");
      dispatch(clearAuthError());

      if (!user?.id) return;

      try {
        await dispatch(
          updateProfile({
            full_name: fullName.trim() || null,
            phone: phone.trim() || null,
            gender: gender || null,
            address_line1: addressLine1.trim() || null,
            address_line2: addressLine2.trim() || null,
            city: city.trim() || null,
            state_region: stateRegion.trim() || null,
            postal_code: postalCode.trim() || null,
            country: country || null,
          })
        ).unwrap();
        setSuccess("Profile updated successfully!");
      } catch {
        // Error is handled by the slice
      }
    },
    [dispatch, user?.id, fullName, phone, gender, addressLine1, addressLine2, city, stateRegion, postalCode, country]
  );

  if (authLoading || loading) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="text-sm font-semibold text-ink">Loading profile...</p>
        </div>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Not signed in</p>
        <p className="mt-1 text-sm text-muted">Please sign in to view your profile.</p>
        <div className="mt-4"><Link to="/auth"><Button>Sign in</Button></Link></div>
      </Card>
    );
  }

  const createdAt = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : user.created_at
      ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "N/A";

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        {/* Header */}
        <div className="flex items-start gap-6">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-3xl font-bold text-white shadow-lg">
            {(fullName?.[0] || user.email?.[0] || "U").toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">My Profile</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">
              {fullName || user.email?.split("@")[0] || "User"}
            </h1>
            <p className="mt-1 text-sm text-muted">{user.email}</p>
            <p className="mt-1 text-xs text-muted">Member since {createdAt}</p>
          </div>
        </div>

        <hr className="my-6 border-border" />

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Account Details (Read-only) */}
          <div>
            <p className="text-sm font-semibold text-ink">Account Details</p>
            <div className="mt-3 rounded-xl border border-border bg-surface/60 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted">Email</p>
                  <p className="mt-1 text-sm text-ink">{user.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted">User ID</p>
                  <p className="mt-1 truncate text-sm font-mono text-ink">{user.id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div>
            <p className="text-sm font-semibold text-ink">Personal Information</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <FormInput label="Full Name" value={fullName} onChange={(e) => { setFullName(e.target.value); clearMessages(); }} placeholder="Enter your full name" autoComplete="name" />
              <FormInput label="Phone Number" value={phone} onChange={(e) => { setPhone(e.target.value); clearMessages(); }} placeholder="+1 (555) 123-4567" autoComplete="tel" />
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted">Gender</span>
                <select value={gender} onChange={(e) => { setGender(e.target.value); clearMessages(); }} className={INPUT_STYLES}>
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-sm font-semibold text-ink">Address</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <FormInput label="Address Line 1" value={addressLine1} onChange={(e) => { setAddressLine1(e.target.value); clearMessages(); }} placeholder="Street address" autoComplete="address-line1" className="sm:col-span-2" />
              <FormInput label="Address Line 2" value={addressLine2} onChange={(e) => { setAddressLine2(e.target.value); clearMessages(); }} placeholder="Apartment, suite, etc. (optional)" autoComplete="address-line2" className="sm:col-span-2" />
              <FormInput label="City" value={city} onChange={(e) => { setCity(e.target.value); clearMessages(); }} placeholder="City" autoComplete="address-level2" />
              <FormInput label="State / Region" value={stateRegion} onChange={(e) => { setStateRegion(e.target.value); clearMessages(); }} placeholder="State or region" autoComplete="address-level1" />
              <FormInput label="Postal Code" value={postalCode} onChange={(e) => { setPostalCode(e.target.value); clearMessages(); }} placeholder="Postal code" autoComplete="postal-code" />
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted">Country</span>
                <select value={country} onChange={(e) => { setCountry(e.target.value); clearMessages(); }} className={INPUT_STYLES} autoComplete="country">
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Messages */}
          {apiError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-600">{apiError}</p>
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link to="/"><Button variant="outline" type="button">Back to Home</Button></Link>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>

        <hr className="my-6 border-border" />

        {/* My Bookings Link */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">My Bookings</p>
            <p className="text-xs text-muted">View and manage your reservations</p>
          </div>
          <Link to="/my-bookings"><Button variant="outline">View Bookings</Button></Link>
        </div>
      </Card>
    </div>
  );
});

export default Profile;
