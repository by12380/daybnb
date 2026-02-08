import React, { useState, useCallback } from "react";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import { useAuth } from "../../auth/useAuth.js";

// Icons
function MailIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function PhoneIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

function LocationIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function CheckCircleIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SendIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

const initialFormState = {
  name: "",
  email: "",
  mobile: "",
  city: "",
  message: "",
};

function ContactUs() {
  const { user } = useAuth();
  const [form, setForm] = useState(() => ({
    ...initialFormState,
    email: user?.email || "",
  }));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!form.name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!form.mobile.trim() || !/^[0-9+\-\s()]{10,15}$/.test(form.mobile.replace(/\s/g, ""))) {
      setError("Please enter a valid mobile number");
      return;
    }
    if (!form.city.trim()) {
      setError("Please enter your city");
      return;
    }
    if (!form.message.trim() || form.message.trim().length < 10) {
      setError("Please enter a message (at least 10 characters)");
      return;
    }

    setSubmitting(true);

    try {
      // Insert contact message
      const { data: messageData, error: insertError } = await supabase
        .from("contact_messages")
        .insert({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          mobile: form.mobile.trim(),
          city: form.city.trim(),
          message: form.message.trim(),
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Create notification for admin
      const { error: notifError } = await supabase.from("notifications").insert({
        type: "contact_message",
        title: "New Contact Message",
        body: `${form.name.trim()} from ${form.city.trim()} sent a message`,
        recipient_role: "admin",
        data: {
          message_id: messageData?.id,
          sender_name: form.name.trim(),
          sender_email: form.email.trim().toLowerCase(),
          city: form.city.trim(),
        },
      });

      if (notifError) {
        // Non-blocking - log but don't fail the submission
        console.warn("Failed to create notification:", notifError);
      }

      setSubmitted(true);
      setForm(initialFormState);
    } catch (err) {
      console.error("Error submitting contact form:", err);
      setError(err.message || "Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendAnother = () => {
    setSubmitted(false);
    setForm({
      ...initialFormState,
      email: user?.email || "",
    });
  };

  return (
    <div className="mx-auto max-w-5xl py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-brand-700 dark:text-brand-400">
          Contact Us
        </h1>
        <p className="mt-2 text-muted dark:text-dark-muted">
          Have a question or feedback? We'd love to hear from you.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Contact Information */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="space-y-6">
            <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">
              Get in Touch
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
                  <MailIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink dark:text-dark-ink">Email</p>
                  <a
                    href="mailto:support@daybnb.com"
                    className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    support@daybnb.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
                  <PhoneIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink dark:text-dark-ink">Phone</p>
                  <a
                    href="tel:+1234567890"
                    className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    +1 (234) 567-890
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
                  <LocationIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink dark:text-dark-ink">Address</p>
                  <p className="text-sm text-muted dark:text-dark-muted">
                    123 Business Street<br />
                    Suite 100<br />
                    San Francisco, CA 94102
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 dark:border-dark-border">
              <p className="text-xs text-muted dark:text-dark-muted">
                Our support team typically responds within 24 hours during business days.
              </p>
            </div>
          </Card>

          {/* FAQ teaser */}
          <Card className="bg-brand-50/50 dark:bg-brand-900/20">
            <h3 className="font-medium text-ink dark:text-dark-ink">
              Frequently Asked Questions
            </h3>
            <p className="mt-1 text-sm text-muted dark:text-dark-muted">
              Find quick answers to common questions about bookings, payments, and more.
            </p>
          </Card>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <Card>
            {submitted ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
                  <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-ink dark:text-dark-ink">
                  Message Sent Successfully!
                </h3>
                <p className="mt-2 text-muted dark:text-dark-muted">
                  Thank you for reaching out. We'll get back to you as soon as possible.
                </p>
                <Button onClick={handleSendAnother} className="mt-6">
                  Send Another Message
                </Button>
              </div>
            ) : (
              <>
                <h2 className="mb-6 text-lg font-semibold text-ink dark:text-dark-ink">
                  Send us a Message
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput
                      label="Full Name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={handleChange}
                      required
                      autoComplete="name"
                    />

                    <FormInput
                      label="Email Address"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput
                      label="Mobile Number"
                      name="mobile"
                      type="tel"
                      placeholder="+1 (234) 567-8900"
                      value={form.mobile}
                      onChange={handleChange}
                      required
                      autoComplete="tel"
                    />

                    <FormInput
                      label="City"
                      name="city"
                      type="text"
                      placeholder="San Francisco"
                      value={form.city}
                      onChange={handleChange}
                      required
                      autoComplete="address-level2"
                    />
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-muted dark:text-dark-muted">
                      Message
                    </span>
                    <textarea
                      name="message"
                      rows={5}
                      placeholder="How can we help you?"
                      value={form.message}
                      onChange={handleChange}
                      required
                      className={`${INPUT_STYLES} resize-none`}
                    />
                  </label>

                  {error && (
                    <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={submitting} className="gap-2">
                      {submitting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <SendIcon className="h-4 w-4" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ContactUs;
