import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import { useAuth } from "../../auth/useAuth.js";

const MAX_MESSAGE_CHARS = 2000;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export default function Contact() {
  const adminFallbackEmail = import.meta.env.VITE_ADMIN_CONTACT_EMAIL || "";
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    city: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" }); // type: success|error|""

  const errors = useMemo(() => {
    const next = {};
    const name = form.name.trim();
    const mobile = form.mobile.trim();
    const email = form.email.trim();
    const city = form.city.trim();
    const message = form.message.trim();

    if (!name) next.name = "Name is required.";
    if (!mobile) next.mobile = "Mobile number is required.";
    if (mobile && mobile.replace(/[^\d]/g, "").length < 7) {
      next.mobile = "Mobile number looks too short.";
    }
    if (!email) next.email = "Email is required.";
    else if (!isValidEmail(email)) next.email = "Please enter a valid email.";
    if (!city) next.city = "City is required.";
    if (!message) next.message = "Message is required.";
    if (message && message.length > MAX_MESSAGE_CHARS) {
      next.message = `Message must be ${MAX_MESSAGE_CHARS} characters or less.`;
    }
    return next;
  }, [form]);

  const canSubmit = Object.keys(errors).length === 0 && !submitting;

  function updateField(key) {
    return (e) => {
      const value = e?.target?.value ?? "";
      setForm((prev) => ({ ...prev, [key]: value }));
      if (status.type) setStatus({ type: "", message: "" });
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) {
      setStatus({ type: "error", message: "Please fix the form errors and try again." });
      return;
    }

    setSubmitting(true);
    setStatus({ type: "", message: "" });

    const payload = {
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      city: form.city.trim(),
      message: form.message.trim(),
      source: "web",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      pageUrl: typeof window !== "undefined" ? window.location.href : "",
      submittedAt: new Date().toISOString(),
      userId: user?.id || null,
    };

    try {
      if (!supabase) throw new Error("Supabase is not configured.");

      const { data, error } = await supabase.functions.invoke("contact-admin", {
        body: payload,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to send message.");

      setStatus({ type: "success", message: "Thanks! Your message was sent to our team." });
      setForm({ name: "", mobile: "", email: "", city: "", message: "" });
    } catch (err) {
      const message =
        err?.message ||
        "We couldn’t send your message right now. Please try again.";

      // Fallback: open a mailto if admin email is configured on the client.
      if (adminFallbackEmail) {
        const subject = encodeURIComponent(`Daybnb Contact: ${payload.name} (${payload.city})`);
        const body = encodeURIComponent(
          [
            `Name: ${payload.name}`,
            `Mobile: ${payload.mobile}`,
            `Email: ${payload.email}`,
            `City: ${payload.city}`,
            "",
            payload.message,
          ].join("\n")
        );
        window.location.href = `mailto:${adminFallbackEmail}?subject=${subject}&body=${body}`;
        setStatus({
          type: "success",
          message:
            "We opened your email app to send this message to support. If it didn’t open, please try again.",
        });
      } else {
        setStatus({ type: "error", message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Support
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Contact Us
        </h1>
        <p className="mt-2 text-sm text-muted">
          Send a message to the Daybnb admin team. You don’t need to be signed in.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-panel p-6 shadow-sm md:p-8">
        {status.type ? (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              status.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-200"
            }`}
          >
            {status.message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
          <FormInput
            label="Name"
            value={form.name}
            onChange={updateField("name")}
            placeholder="Your full name"
            autoComplete="name"
          />
          <FormInput
            label="Mobile number"
            value={form.mobile}
            onChange={updateField("mobile")}
            placeholder="e.g. +1 555 123 4567"
            autoComplete="tel"
            inputMode="tel"
          />
          <FormInput
            label="Email address"
            value={form.email}
            onChange={updateField("email")}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
          />
          <FormInput
            label="City"
            value={form.city}
            onChange={updateField("city")}
            placeholder="City"
            autoComplete="address-level2"
          />

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-muted">Message</span>
            <textarea
              className={INPUT_STYLES}
              rows={6}
              value={form.message}
              onChange={updateField("message")}
              placeholder="How can we help?"
              maxLength={MAX_MESSAGE_CHARS}
            />
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{errors.message || ""}</span>
              <span>
                {form.message.trim().length}/{MAX_MESSAGE_CHARS}
              </span>
            </div>
          </label>

          <div className="md:col-span-2">
            <div className="grid gap-2 text-xs text-red-600 dark:text-red-300">
              {errors.name ? <p>{errors.name}</p> : null}
              {errors.mobile ? <p>{errors.mobile}</p> : null}
              {errors.email ? <p>{errors.email}</p> : null}
              {errors.city ? <p>{errors.city}</p> : null}
              {errors.message ? <p>{errors.message}</p> : null}
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-muted">
              By submitting, you agree to be contacted about your request.
            </p>
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="text-sm font-semibold text-muted hover:text-brand-600 dark:hover:text-brand-400"
              >
                Back to home
              </Link>
              <Button type="submit" disabled={!canSubmit}>
                {submitting ? "Sending..." : "Send message"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

