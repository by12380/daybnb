import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Card from "../guest/components/ui/Card.jsx";
import Button from "../guest/components/ui/Button.jsx";
import FormInput from "../guest/components/ui/FormInput.jsx";
import { useAuth } from "../auth/useAuth.js";

const Auth = React.memo(() => {
  const { session, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectTo = useMemo(() => {
    const redirect = searchParams.get("redirect");
    return redirect && redirect.startsWith("/") ? redirect : "/";
  }, [searchParams]);

  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!loading && session) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, navigate, redirectTo, session]);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setSubmitting(true);
      setError("");
      setInfo("");
      try {
        const authFn = mode === "signup" ? signUp : signIn;
        const result = await authFn({ email, password });
        
      } catch (err) {
        setError(err?.message || "Authentication failed.");
      } finally {
        setSubmitting(false);
      }
    },
    [email, mode, password, signIn, signUp]
  );

  const toggleMode = useCallback(() => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setError("");
    setInfo("");
  }, []);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 md:grid-cols-2">
      <Card className="md:col-span-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          Daybnb
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Sign in to book day-use rooms. We’ll keep your session active.
        </p>
        <div className="mt-6 space-y-2 text-sm text-muted">
          <p className="font-medium text-ink">Email + password</p>
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

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {info ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
              {info}
            </div>
          ) : null}

          <Button className="w-full" type="submit" disabled={submitting || loading}>
            {submitting
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </Button>

          <button
            type="button"
            onClick={toggleMode}
            className="w-full rounded-full px-4 py-2 text-sm font-semibold text-brand-700 hover:text-accent-500"
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

