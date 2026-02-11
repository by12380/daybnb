import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Card from "../guest/components/ui/Card.jsx";
import Button from "../guest/components/ui/Button.jsx";
import FormInput from "../guest/components/ui/FormInput.jsx";
import { useAuth } from "../auth/useAuth.js";
import { useProfile } from "../auth/useProfile.js";
import api from "../redux/api.js";

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

const Auth = React.memo(() => {
  const { session, loading, signIn, signUp } = useAuth();
  const { isAdmin, isOwner, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectTo = useMemo(() => {
    const redirect = searchParams.get("redirect");
    return redirect && redirect.startsWith("/") ? redirect : null;
  }, [searchParams]);

  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("customer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const ensureProfileRow = useCallback(
    async ({ user, isSignUp, role }) => {
      if (!user?.id) return;

      try {
        await api.post("/auth/ensure-profile", {
          is_signup: isSignUp,
          role: role || "customer",
        });
      } catch (err) {
        console.warn("Could not ensure profile:", err);
      }
    },
    []
  );

  useEffect(() => {
    if (!loading && !profileLoading && session) {
      if (redirectTo && !isAdmin && !isOwner) {
        navigate(redirectTo, { replace: true });
      } else if (isAdmin) {
        navigate("/admin", { replace: true });
      } else if (isOwner) {
        navigate("/owner", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [loading, profileLoading, navigate, redirectTo, session, isAdmin, isOwner]);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setSubmitting(true);
      setError("");
      setInfo("");
      try {
        if (mode === "signup") {
          const result = await signUp({ email, password });
          const authedUser = result?.data?.user || result?.data?.session?.user || null;
          await ensureProfileRow({
            user: authedUser,
            isSignUp: true,
            role: selectedRole,
          });
        } else {
          const result = await signIn({ email, password });
          const authedUser = result?.data?.user || result?.data?.session?.user || null;
          await ensureProfileRow({ user: authedUser, isSignUp: false });
        }
      } catch (err) {
        setError(err?.message || "Authentication failed.");
      } finally {
        setSubmitting(false);
      }
    },
    [email, mode, password, signIn, signUp, ensureProfileRow, selectedRole]
  );

  const toggleMode = useCallback(() => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setError("");
    setInfo("");
  }, []);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 md:grid-cols-2">
      <Card className="md:col-span-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gradient dark:text-gradient-dark">
          Daybnb
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink dark:text-dark-ink">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted dark:text-dark-muted">
          {mode === "login"
            ? "Sign in to access your account."
            : "Choose how you'd like to use DayBnB."}
        </p>
        <div className="mt-6 space-y-2 text-sm text-muted dark:text-dark-muted">
          <p className="font-medium text-ink dark:text-dark-ink">Email + password</p>
          <p>Simple and secure authentication via Supabase.</p>
        </div>
      </Card>

      <Card className="md:col-span-1">
        <form onSubmit={onSubmit} className="space-y-4">
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
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {/* Role selection – only shown during signup */}
          {mode === "signup" && (
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
          )}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          ) : null}

          {info ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              {info}
            </div>
          ) : null}

          <Button className="w-full" type="submit" disabled={submitting || loading}>
            {submitting
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : `Create ${selectedRole === "owner" ? "Owner" : "Customer"} account`}
          </Button>

          <button
            type="button"
            onClick={toggleMode}
            className="w-full rounded-full px-4 py-2 text-sm font-semibold text-brand-700 hover:text-accent-500 dark:text-brand-400 dark:hover:text-accent-500"
          >
            {mode === "login"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </form>
      </Card>
    </div>
  );
});

export default Auth;
