import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Card from "../guest/components/ui/Card.jsx";
import Button from "../guest/components/ui/Button.jsx";
import FormInput from "../guest/components/ui/FormInput.jsx";
import { useAuth } from "../auth/useAuth.js";
import { useProfile } from "../auth/useProfile.js";
import api from "../redux/api.js";

// ── Role picker options ──────────────────────────────────────

const ROLE_OPTIONS = [
  {
    value: "customer",
    label: "Customer",
    description: "Book day-use rooms and enjoy stays",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    value: "owner",
    label: "Property Owner",
    description: "List and manage your properties",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
      </svg>
    ),
  },
];

// ── Step indicator ────────────────────────────────────────────

const StepIndicator = React.memo(({ current, total }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {Array.from({ length: total }, (_, i) => (
      <React.Fragment key={i}>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
            i < current
              ? "bg-green-500 text-white"
              : i === current
                ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30 scale-110"
                : "bg-surface/80 text-muted border border-border"
          }`}
        >
          {i < current ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            i + 1
          )}
        </div>
        {i < total - 1 && (
          <div className={`h-0.5 w-8 rounded-full transition-colors duration-300 ${
            i < current ? "bg-green-500" : "bg-border"
          }`} />
        )}
      </React.Fragment>
    ))}
  </div>
));

// ── Main Auth component ───────────────────────────────────────

const Auth = React.memo(() => {
  const { session, loading, signIn, signUp } = useAuth();
  const { profile, isAdmin, isOwner, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectTo = useMemo(() => {
    const redirect = searchParams.get("redirect");
    return redirect && redirect.startsWith("/") ? redirect : null;
  }, [searchParams]);

  // ── Shared state ──────────────────────────────────────────
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("customer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // ── Signup multi-step state ───────────────────────────────
  // Steps: 0 = email+password+role, 1 = check-your-email, 2 = basic details
  const [signupStep, setSignupStep] = useState(0);

  // Details form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // ── Navigate by role ──────────────────────────────────────
  const navigateByRole = useCallback(
    (role) => {
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "owner") {
        navigate("/owner", { replace: true });
      } else if (redirectTo) {
        navigate(redirectTo, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    },
    [navigate, redirectTo]
  );

  // ── Redirect if already logged in ─────────────────────────
  // Always navigate directly by role; profile details are optional.
  useEffect(() => {
    if (loading || profileLoading) return;
    if (!session) return;

    // User is logged in — redirect normally
    if (redirectTo && !isAdmin && !isOwner) {
      navigate(redirectTo, { replace: true });
    } else if (isAdmin) {
      navigate("/admin", { replace: true });
    } else if (isOwner) {
      navigate("/owner", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [loading, profileLoading, navigate, redirectTo, session, profile, isAdmin, isOwner]);

  // ── Login handler ─────────────────────────────────────────
  const onLogin = useCallback(
    async (e) => {
      e.preventDefault();
      setSubmitting(true);
      setError("");
      setInfo("");
      try {
        await signIn({ email, password });

        // Ensure profile exists
        try {
          await api.post("/auth/ensure-profile", { is_signup: false });
        } catch {}

        // Fetch role from profile
        let role = "customer";
        try {
          const { data: meData } = await api.get("/auth/me");
          role = meData?.role || meData?.profile?.user_type || "customer";
        } catch {}

        navigateByRole(role);
      } catch (err) {
        setError(err?.message || "Authentication failed.");
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, signIn, navigateByRole]
  );

  // ── Signup: submit email + password + role ────────────────
  const onSignup = useCallback(
    async (e) => {
      e.preventDefault();
      setSubmitting(true);
      setError("");
      setInfo("");
      try {
        const result = await signUp({
          email,
          password,
          options: {
            data: { role: selectedRole },
          },
        });
        const user = result?.user;

        // Supabase signUp with email confirmation enabled returns a user
        // but no session (user.identities will be empty array if email exists)
        if (user?.identities?.length === 0) {
          setError("An account with this email already exists. Please sign in.");
          return;
        }

        // If we got a session, email confirmation is disabled — go to details
        if (result?.session) {
          // Ensure profile row
          try {
            await api.post("/auth/ensure-profile", {
              is_signup: true,
              role: selectedRole,
            });
          } catch {}
          setSignupStep(2);
          return;
        }

        // No session means email confirmation is required
        setSignupStep(1);
        setInfo("We've sent a confirmation link to your email. Please check your inbox.");
      } catch (err) {
        setError(err?.message || "Signup failed.");
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, selectedRole, signUp]
  );

  // ── Complete profile details ──────────────────────────────
  const onCompleteDetails = useCallback(
    async (e) => {
      e.preventDefault();
      setSubmitting(true);
      setError("");
      setInfo("");
      try {
        // Ensure profile row exists first
        try {
          await api.post("/auth/ensure-profile", {
            is_signup: true,
            role: selectedRole,
          });
        } catch {}

        // Update profile with the details
        await api.put("/auth/profile", {
          full_name: fullName,
          phone,
          address_line1: addressLine1,
          city,
          state_region: stateRegion,
          postal_code: postalCode,
        });

        // Refetch profile so role is up to date
        await refetchProfile();

        // Fetch role and navigate
        let role = selectedRole;
        try {
          const { data: meData } = await api.get("/auth/me");
          role = meData?.role || meData?.profile?.user_type || selectedRole;
        } catch {}

        navigateByRole(role);
      } catch (err) {
        setError(err?.message || "Failed to save details.");
      } finally {
        setSubmitting(false);
      }
    },
    [fullName, phone, addressLine1, city, stateRegion, postalCode, selectedRole, navigateByRole, refetchProfile]
  );

  // ── Mode toggle ───────────────────────────────────────────
  const toggleMode = useCallback(() => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setError("");
    setInfo("");
    setSignupStep(0);
  }, []);

  // ── Go back to previous step ──────────────────────────────
  const goBack = useCallback(() => {
    setError("");
    setInfo("");
    if (signupStep > 0) {
      setSignupStep((s) => s - 1);
    }
  }, [signupStep]);

  // ── Left panel content ────────────────────────────────────
  const leftPanelContent = useMemo(() => {
    if (mode === "login") {
      return {
        title: "Welcome back",
        subtitle: "Sign in to access your account.",
        detail: "Email + password authentication via Supabase.",
      };
    }
    if (signupStep === 0) {
      return {
        title: "Create your account",
        subtitle: "Choose how you'd like to use DayBnB.",
        detail: "Enter your email and password to get started.",
      };
    }
    if (signupStep === 1) {
      return {
        title: "Check your email",
        subtitle: `We sent a confirmation link to ${email}`,
        detail: "Click the link in your email to verify your account, then come back here.",
      };
    }
    return {
      title: "Almost there!",
      subtitle: "Tell us a bit about yourself.",
      detail: "This helps us personalize your experience.",
    };
  }, [mode, signupStep, email]);

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 md:grid-cols-2">
      {/* Left panel */}
      <Card className="md:col-span-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gradient dark:text-gradient-dark">
          Daybnb
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink dark:text-dark-ink">
          {leftPanelContent.title}
        </h1>
        <p className="mt-2 text-sm text-muted dark:text-dark-muted">
          {leftPanelContent.subtitle}
        </p>
        <div className="mt-6 space-y-2 text-sm text-muted dark:text-dark-muted">
          <p className="font-medium text-ink dark:text-dark-ink">
            {mode === "login" ? "Email + password" : signupStep === 1 ? "Waiting for confirmation" : `Step ${signupStep + 1} of 2`}
          </p>
          <p>{leftPanelContent.detail}</p>
        </div>
      </Card>

      {/* Right panel */}
      <Card className="md:col-span-1">
        {/* ─── LOGIN ─── */}
        {mode === "login" && (
          <form onSubmit={onLogin} className="space-y-4">
            <FormInput
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
            />
            <FormInput
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}

            <Button className="w-full" type="submit" disabled={submitting || loading}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>

            <button
              type="button"
              onClick={toggleMode}
              className="w-full rounded-full px-4 py-2 text-sm font-semibold text-brand-700 hover:text-accent-500 dark:text-brand-400 dark:hover:text-accent-500"
            >
              New here? Create an account
            </button>
          </form>
        )}

        {/* ─── SIGNUP STEP 0: Email + Password + Role ─── */}
        {mode === "signup" && signupStep === 0 && (
          <form onSubmit={onSignup} className="space-y-4">
            <StepIndicator current={0} total={2} />

            <FormInput
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
            />
            <FormInput
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {/* Role selection */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted">I want to join as</span>
              <div className="grid grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedRole(option.value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                      selectedRole === option.value
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
                        : "border-border bg-panel text-muted hover:border-brand-200 hover:bg-surface/60"
                    }`}
                  >
                    <div
                      className={`rounded-lg p-2 ${
                        selectedRole === option.value
                          ? "bg-brand-100 text-brand-600 dark:bg-brand-800/50 dark:text-brand-300"
                          : "bg-surface/60 text-muted"
                      }`}
                    >
                      {option.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p className="mt-0.5 text-xs opacity-75">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}

            <Button className="w-full" type="submit" disabled={submitting || loading}>
              {submitting ? "Creating account..." : "Continue"}
            </Button>

            <button
              type="button"
              onClick={toggleMode}
              className="w-full rounded-full px-4 py-2 text-sm font-semibold text-brand-700 hover:text-accent-500 dark:text-brand-400 dark:hover:text-accent-500"
            >
              Already have an account? Sign in
            </button>
          </form>
        )}

        {/* ─── SIGNUP STEP 1: Check your email ─── */}
        {mode === "signup" && signupStep === 1 && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-900/30">
              <svg className="h-8 w-8 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>

            <div>
              <p className="text-base font-semibold text-ink dark:text-dark-ink">
                Check your email
              </p>
              <p className="mt-2 text-sm text-muted dark:text-dark-muted">
                We sent a confirmation link to
              </p>
              <p className="mt-1 text-sm font-medium text-ink dark:text-dark-ink">
                {email}
              </p>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              Click the link in your email to confirm your account. Once confirmed, come back to this page to complete your profile.
            </div>

            <p className="text-xs text-muted dark:text-dark-muted">
              Don't see the email? Check your spam folder.
            </p>

            <button
              type="button"
              onClick={goBack}
              className="text-sm font-medium text-muted hover:text-ink dark:hover:text-dark-ink"
            >
              &larr; Back to signup
            </button>
          </div>
        )}

        {/* ─── SIGNUP STEP 2: Basic Details ─── */}
        {mode === "signup" && signupStep === 2 && (
          <form onSubmit={onCompleteDetails} className="space-y-4">
            <StepIndicator current={1} total={2} />

            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Email verified successfully
            </div>

            <FormInput
              label="Full Name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />

            <FormInput
              label="Phone Number"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />

            <FormInput
              label="Address"
              type="text"
              autoComplete="street-address"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="123 Main St"
            />

            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="City"
                type="text"
                autoComplete="address-level2"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="San Francisco"
              />
              <FormInput
                label="State"
                type="text"
                autoComplete="address-level1"
                required
                value={stateRegion}
                onChange={(e) => setStateRegion(e.target.value)}
                placeholder="CA"
              />
            </div>

            <FormInput
              label="Pincode / ZIP"
              type="text"
              autoComplete="postal-code"
              required
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="94102"
            />

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}

            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Complete Setup"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
});

export default Auth;
