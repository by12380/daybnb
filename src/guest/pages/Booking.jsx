import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { StarsDisplay, StarsInput } from "../components/ui/Stars.jsx";
import { DAYTIME_END, DAYTIME_START } from "../utils/constants.js";
import { formatPrice, calculateTotalPrice } from "../utils/format.js";
import { useAuth } from "../../auth/useAuth.js";
import { supabase } from "../../lib/supabaseClient.js";
import { fetchReviewsForRoom, upsertRoomReview } from "../utils/roomReviews.js";
import { createCheckoutSession, redirectToCheckout } from "../../lib/stripe.js";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=60";

const TIME_STEP_MINUTES = 30;
const BOOKINGS_TABLE = "bookings";
const ROOM_REVIEWS_TABLE = "room_reviews";

function normalizeTags(value, type) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return type ? [String(type)] : [];
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function parseTimeToMinutes(value) {
  const [h, m] = String(value || "0:0")
    .split(":")
    .map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return clamp(h, 0, 23) * 60 + clamp(m, 0, 59);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function minutesToTimeValue(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function minutesToLabel(totalMinutes) {
  const h24 = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 + 11) % 12) + 1;
  const mm = pad2(m);
  return `${h12}:${mm} ${suffix}`;
}

function buildTimeOptions({ start, end, stepMinutes }) {
  const startM = parseTimeToMinutes(start);
  const endM = parseTimeToMinutes(end);
  const step = Math.max(5, Number(stepMinutes) || 30);
  const out = [];
  for (let m = startM; m <= endM; m += step) {
    out.push({ value: minutesToTimeValue(m), label: minutesToLabel(m), minutes: m });
  }
  return out;
}

function getDisabledTimeSlots(existingBookings) {
  const disabled = new Set();
  for (const booking of existingBookings) {
    const bookingStart = parseTimeToMinutes(booking.start_time);
    const bookingEnd = parseTimeToMinutes(booking.end_time);
    // Mark all slots within this booking as disabled
    for (let m = bookingStart; m < bookingEnd; m += TIME_STEP_MINUTES) {
      disabled.add(m);
    }
  }
  return disabled;
}

function isTimeSlotOverlapping(existingBookings, startMinutes, endMinutes) {
  for (const booking of existingBookings) {
    const bookingStart = parseTimeToMinutes(booking.start_time);
    const bookingEnd = parseTimeToMinutes(booking.end_time);
    // Check for overlap: two ranges overlap if start1 < end2 AND start2 < end1
    if (startMinutes < bookingEnd && bookingStart < endMinutes) {
      return true;
    }
  }
  return false;
}

const Booking = React.memo(() => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState(DAYTIME_START);
  const [endTime, setEndTime] = useState(DAYTIME_END);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  // Check if this is a retry payment from a cancelled checkout
  const retryBookingId = searchParams.get("retry");

  // State for existing bookings on selected date
  const [dateBookings, setDateBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      setRoom(null);
      setSuccess("");

      if (!supabase) {
        setError(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        );
        return;
      }

      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message || "Failed to load room.");
        setLoading(false);
        return;
      }

      if (!data) {
        setError(
          "Room not found (or access denied by RLS). If the room exists in Supabase, add a SELECT policy for `rooms`."
        );
        setLoading(false);
        return;
      }

      setRoom(data);
      setLoading(false);
    }

    if (roomId) load();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Load reviews for this room
  useEffect(() => {
    let cancelled = false;

    async function loadRoomReviews() {
      setReviewsError("");
      setReviewSuccess("");

      if (!roomId || !supabase) {
        setReviews([]);
        return;
      }

      setLoadingReviews(true);
      try {
        const rows = await fetchReviewsForRoom(roomId);
        if (!cancelled) setReviews(rows || []);
      } catch (e) {
        if (!cancelled) setReviewsError(e.message || "Failed to load reviews.");
      } finally {
        if (!cancelled) setLoadingReviews(false);
      }
    }

    loadRoomReviews();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Prefill if user already reviewed this room
  useEffect(() => {
    let cancelled = false;

    async function loadExistingReview() {
      if (!supabase || !roomId || !user?.id) return;
      const { data: existing, error: existingErr } = await supabase
        .from(ROOM_REVIEWS_TABLE)
        .select("rating, note")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled && !existingErr && existing) {
        setReviewRating(Number(existing.rating) || 0);
        setReviewNote(existing.note || "");
      }
    }

    loadExistingReview();
    return () => {
      cancelled = true;
    };
  }, [roomId, user?.id]);

  useEffect(() => {
    // Prefill from Supabase user metadata where possible.
    const nameFromMeta =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.display_name ||
      "";
    const phoneFromMeta = user?.phone || user?.user_metadata?.phone || "";
    setFullName((prev) => (prev ? prev : String(nameFromMeta || "")));
    setPhone((prev) => (prev ? prev : String(phoneFromMeta || "")));
  }, [user]);

  // Fetch existing bookings for the selected date and room
  useEffect(() => {
    if (!date || !roomId || !supabase) {
      setDateBookings([]);
      return;
    }

    let cancelled = false;

    async function fetchDateBookings() {
      setLoadingBookings(true);
      const { data, error: fetchError } = await supabase
        .from(BOOKINGS_TABLE)
        .select("*")
        .eq("room_id", roomId)
        .eq("booking_date", date);

      if (cancelled) return;

      if (fetchError) {
        console.error("Error fetching bookings for date:", fetchError);
        setDateBookings([]);
      } else {
        setDateBookings(data || []);
      }
      setLoadingBookings(false);
    }

    fetchDateBookings();
    return () => { cancelled = true; };
  }, [date, roomId]);

  const tags = useMemo(() => normalizeTags(room?.tags, room?.type), [room?.tags, room?.type]);

  const allTimes = useMemo(
    () =>
      buildTimeOptions({
        start: DAYTIME_START,
        end: DAYTIME_END,
        stepMinutes: TIME_STEP_MINUTES,
      }),
    []
  );

  const daytimeStartMinutes = useMemo(() => parseTimeToMinutes(DAYTIME_START), []);
  const daytimeEndMinutes = useMemo(() => parseTimeToMinutes(DAYTIME_END), []);

  const startMinutes = useMemo(() => parseTimeToMinutes(startTime), [startTime]);
  const endMinutes = useMemo(() => parseTimeToMinutes(endTime), [endTime]);

  const disabledSlots = useMemo(
    () => getDisabledTimeSlots(dateBookings),
    [dateBookings]
  );

  const startOptions = useMemo(() => {
    const lastStart = daytimeEndMinutes - TIME_STEP_MINUTES;
    return allTimes
      .filter((t) => t.minutes >= daytimeStartMinutes && t.minutes <= lastStart)
      .map((t) => ({
        ...t,
        disabled: disabledSlots.has(t.minutes),
      }));
  }, [allTimes, daytimeEndMinutes, daytimeStartMinutes, disabledSlots]);

  const endOptions = useMemo(() => {
    const minEnd = startMinutes + TIME_STEP_MINUTES;
    return allTimes
      .filter((t) => t.minutes >= minEnd && t.minutes <= daytimeEndMinutes)
      .map((t) => {
        // End time is disabled if any slot between start and this end is booked
        let isDisabled = false;
        for (let m = startMinutes; m < t.minutes; m += TIME_STEP_MINUTES) {
          if (disabledSlots.has(m)) {
            isDisabled = true;
            break;
          }
        }
        return { ...t, disabled: isDisabled };
      });
  }, [allTimes, daytimeEndMinutes, startMinutes, disabledSlots]);

  useEffect(() => {
    // Keep end time valid if start time changes.
    const minEnd = startMinutes + TIME_STEP_MINUTES;
    if (endMinutes < minEnd) {
      const next = minutesToTimeValue(clamp(minEnd, daytimeStartMinutes, daytimeEndMinutes));
      setEndTime(next);
    }
  }, [daytimeEndMinutes, daytimeStartMinutes, endMinutes, startMinutes]);

  const durationHours = useMemo(() => {
    const minutes = Math.max(0, endMinutes - startMinutes);
    return minutes / 60;
  }, [endMinutes, startMinutes]);

  const durationText = useMemo(() => {
    if (!Number.isFinite(durationHours) || durationHours <= 0) return "";
    return `${durationHours % 1 === 0 ? String(durationHours) : durationHours.toFixed(1)} hour${durationHours === 1 ? "" : "s"}`;
  }, [durationHours]);

  // Price calculation
  const pricePerHour = room?.price_per_hour ?? 0;
  const totalPrice = useMemo(() => {
    if (!Number.isFinite(durationHours) || durationHours <= 0) return 0;
    return calculateTotalPrice(durationHours, pricePerHour);
  }, [durationHours, pricePerHour]);

  const onDateChange = useCallback((_, dateString) => {
    setDate(dateString || "");
    setSuccess("");
    setError("");
  }, []);

  const onStartChange = useCallback((e) => {
    setStartTime(e.target.value);
    setSuccess("");
    setError("");
  }, []);

  const onEndChange = useCallback((e) => {
    setEndTime(e.target.value);
    setSuccess("");
    setError("");
  }, []);

  const onFullNameChange = useCallback((e) => setFullName(e.target.value), []);
  const onPhoneChange = useCallback((e) => setPhone(e.target.value), []);

  const ratingSummary = useMemo(() => {
    const count = (reviews || []).length;
    if (!count) return { avg: 0, count: 0 };
    const sum = (reviews || []).reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return { avg: sum / count, count };
  }, [reviews]);

  const onSubmitReview = useCallback(
    async (e) => {
      e.preventDefault();
      setReviewsError("");
      setReviewSuccess("");

      if (!user?.id) {
        setReviewsError("You must be signed in to leave a review.");
        return;
      }

      const rating = Number(reviewRating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        setReviewsError("Please select a star rating (1–5).");
        return;
      }

      if (!supabase) {
        setReviewsError(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        );
        return;
      }

      const nameFromMeta =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.user_metadata?.display_name ||
        null;

      setReviewSubmitting(true);
      try {
        await upsertRoomReview({
          room_id: roomId,
          user_id: user.id,
          booking_id: null,
          user_email: user.email ?? null,
          user_full_name: nameFromMeta ? String(nameFromMeta) : null,
          rating,
          note: reviewNote?.trim() || null,
        });

        const rows = await fetchReviewsForRoom(roomId);
        setReviews(rows || []);
        setReviewSuccess("Thanks! Your review has been saved.");
      } catch (err) {
        const message = err?.message || "Failed to save review.";
        const hint =
          message?.toLowerCase?.().includes("does not exist") ||
          message?.toLowerCase?.().includes("not found")
            ? `\n\nCreate a \`${ROOM_REVIEWS_TABLE}\` table with columns: room_id (uuid/text), user_id (uuid/text), booking_id (uuid/text, optional), rating (int), note (text, optional), user_email (text), user_full_name (text), created_at (timestamptz). Add a UNIQUE constraint on (user_id, room_id).`
            : message?.toLowerCase?.().includes("row level security") ||
                message?.toLowerCase?.().includes("rls")
              ? `\n\nIf RLS is enabled, add INSERT/UPDATE/SELECT policies to \`${ROOM_REVIEWS_TABLE}\` for authenticated users.`
              : "";
        setReviewsError(`${message}${hint}`);
      } finally {
        setReviewSubmitting(false);
      }
    },
    [reviewNote, reviewRating, roomId, user?.email, user?.id, user?.user_metadata]
  );

  const validate = useCallback(() => {
    if (!roomId) return "Missing room id.";
    if (!user?.id) return "You must be signed in to book.";
    if (!date) return "Please select a date.";
    const s = parseTimeToMinutes(startTime);
    const e = parseTimeToMinutes(endTime);
    const min = parseTimeToMinutes(DAYTIME_START);
    const max = parseTimeToMinutes(DAYTIME_END);
    if (s < min || s >= max) return "Start time must be between 8:00 AM and 5:00 PM.";
    if (e <= min || e > max) return "End time must be between 8:00 AM and 5:00 PM.";
    if (e <= s) return "End time must be after start time.";
    return "";
  }, [date, endTime, roomId, startTime, user?.id]);

  // Handle payment for existing booking (retry scenario)
  const handlePayment = useCallback(
    async (bookingId, bookingData) => {
      setProcessingPayment(true);
      setError("");

      try {
        const { sessionId, url } = await createCheckoutSession({
          bookingId,
          roomTitle: room?.title || "Room Booking",
          roomId,
          totalPrice: bookingData.total_price || totalPrice,
          durationHours: bookingData.billable_hours || durationHours,
          pricePerHour: bookingData.price_per_hour || pricePerHour,
          bookingDate: bookingData.booking_date || date,
          startTime: bookingData.start_time || startTime,
          endTime: bookingData.end_time || endTime,
          userEmail: user?.email,
          userId: user?.id,
        });

        // Redirect to Stripe Checkout
        if (url) {
          window.location.href = url;
        } else if (sessionId) {
          await redirectToCheckout(sessionId);
        }
      } catch (err) {
        console.error("Payment error:", err);
        setError(err.message || "Failed to initiate payment. Please try again.");
        setProcessingPayment(false);
      }
    },
    [room?.title, roomId, totalPrice, durationHours, pricePerHour, date, startTime, endTime, user?.email, user?.id]
  );

  // Handle retry payment for existing booking
  useEffect(() => {
    if (retryBookingId && supabase && room) {
      async function loadRetryBooking() {
        const { data } = await supabase
          .from(BOOKINGS_TABLE)
          .select("*")
          .eq("id", retryBookingId)
          .maybeSingle();

        if (data && data.payment_status !== "paid") {
          // Pre-fill form with existing booking data
          if (data.booking_date) setDate(data.booking_date);
          if (data.start_time) setStartTime(data.start_time);
          if (data.end_time) setEndTime(data.end_time);
          if (data.user_full_name) setFullName(data.user_full_name);
          if (data.user_phone) setPhone(data.user_phone);
        }
      }
      loadRetryBooking();
    }
  }, [retryBookingId, room]);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setSuccess("");

      const message = validate();
      if (message) {
        setError(message);
        return;
      }

      if (!supabase) {
        setError(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        );
        return;
      }

      // Check for overlapping bookings
      const s = parseTimeToMinutes(startTime);
      const en = parseTimeToMinutes(endTime);
      if (isTimeSlotOverlapping(dateBookings, s, en)) {
        setError("This time slot overlaps with an existing booking. Please choose a different time.");
        return;
      }

      setSubmitting(true);
      setError("");

      const payload = {
        room_id: roomId,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        user_id: user.id,
        user_email: user.email ?? null,
        user_full_name: fullName?.trim() || null,
        user_phone: phone?.trim() || null,
        total_price: totalPrice > 0 ? totalPrice : null,
        price_per_hour: pricePerHour > 0 ? pricePerHour : null,
        billable_hours: durationHours > 0 ? durationHours : null,
        status: "pending",
        payment_status: "pending", // Payment not yet completed
      };

      const { data: insertedData, error: insertError } = await supabase
        .from(BOOKINGS_TABLE)
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        const hint =
          insertError?.message?.toLowerCase?.().includes("does not exist") ||
          insertError?.message?.toLowerCase?.().includes("not found")
            ? `\n\nCreate a \`${BOOKINGS_TABLE}\` table with columns: room_id (text/uuid), booking_date (date), start_time (text/time), end_time (text/time), user_id (uuid/text), user_email (text), user_full_name (text), user_phone (text), payment_status (text), stripe_session_id (text).`
            : insertError?.message?.toLowerCase?.().includes("row level security") ||
                insertError?.message?.toLowerCase?.().includes("rls")
              ? `\n\nIf RLS is enabled, add an INSERT policy to \`${BOOKINGS_TABLE}\` for authenticated users.`
              : "";
        setError(`${insertError.message || "Failed to create booking."}${hint}`);
        setSubmitting(false);
        return;
      }

      setSubmitting(false);

      // If there's a price, redirect to payment
      if (totalPrice > 0 && insertedData?.id) {
        setSuccess("Booking created! Redirecting to payment...");
        await handlePayment(insertedData.id, insertedData);
      } else {
        // No price or free booking - just confirm
        setSuccess("Booking request submitted! Awaiting admin approval. Redirecting to your bookings...");
        setTimeout(() => {
          const bookingId = insertedData?.id;
          navigate(bookingId ? `/my-bookings?highlight=${bookingId}` : "/my-bookings");
        }, 1500);
      }
    },
    [date, dateBookings, durationHours, endTime, fullName, handlePayment, navigate, phone, pricePerHour, roomId, startTime, totalPrice, user?.email, user?.id, validate]
  );

  if (loading) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Loading room…</p>
        <p className="mt-1 text-sm text-muted">Fetching details from Supabase.</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Unable to load room</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
        <div className="mt-4">
          <Link to="/">
            <Button>Back to home</Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (!room) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Room not found</p>
        <p className="mt-1 text-sm text-muted">
          That room doesn’t exist. Go back to the homepage and pick another one.
        </p>
        <div className="mt-4">
          <Link to="/">
            <Button>Back to home</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card className="md:col-span-3 overflow-hidden p-0">
        <img
          src={room.image || FALLBACK_IMAGE}
          alt={room.title}
          className="h-56 w-full object-cover"
          loading="lazy"
        />
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Booking
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">{room.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {room.location} · Up to {room.guests} guests
          </p>
          <div className="mt-3">
            <StarsDisplay value={ratingSummary.avg} count={ratingSummary.count} />
          </div>
          {pricePerHour > 0 && (
            <p className="mt-2 text-lg font-semibold text-brand-700">
              {formatPrice(pricePerHour)}<span className="text-sm font-normal text-muted">/hour</span>
            </p>
          )}
          {tags.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-surface/60 px-2 py-0.5 text-[11px] text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="md:col-span-2">
        <p className="text-sm font-semibold text-ink">Book your daytime stay</p>
        <p className="mt-1 text-sm text-muted">
          Pick <span className="font-medium text-ink">one date</span> and a time window between{" "}
          <span className="font-medium text-ink">8:00 AM</span> and{" "}
          <span className="font-medium text-ink">5:00 PM</span>.
        </p>

        <form className="mt-4 space-y-4" onSubmit={onSubmit} noValidate>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Date</span>
            <DatePicker
              className={INPUT_STYLES}
              placeholder="Select date"
              value={date ? dayjs(date) : null}
              onChange={onDateChange}
              disabledDate={(current) => current && current < dayjs().startOf("day")}
            />
          </label>

          {loadingBookings && (
            <p className="text-xs text-muted">Loading available time slots...</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted">Start time</span>
              <select value={startTime} onChange={onStartChange} className={INPUT_STYLES}>
                {startOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}{opt.disabled ? " (Booked)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted">End time</span>
              <select value={endTime} onChange={onEndChange} className={INPUT_STYLES}>
                {endOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}{opt.disabled ? " (Unavailable)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Price Breakdown */}
          {durationText && pricePerHour > 0 ? (
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/30">
              <p className="text-sm font-semibold text-ink dark:text-dark-ink">Price Breakdown</p>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted dark:text-dark-muted">Duration</span>
                  <span className="font-medium text-ink dark:text-dark-ink">{durationText}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted dark:text-dark-muted">Hourly Rate</span>
                  <span className="font-medium text-ink dark:text-dark-ink">{formatPrice(pricePerHour)}/hr</span>
                </div>
                <div className="border-t border-brand-100 pt-2 dark:border-brand-800">
                  <div className="flex justify-between">
                    <span className="font-semibold text-ink dark:text-dark-ink">Total</span>
                    <span className="text-lg font-bold text-brand-700 dark:text-brand-400">{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : durationText ? (
            <p className="text-xs text-muted dark:text-dark-muted">Total time: {durationText}</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput
              label="Full name (optional)"
              value={fullName}
              onChange={onFullNameChange}
              placeholder="Ada Lovelace"
              autoComplete="name"
            />
            <FormInput
              label="Phone (optional)"
              value={phone}
              onChange={onPhoneChange}
              placeholder="+1 (555) 123-4567"
              autoComplete="tel"
            />
          </div>

          <p className="text-xs text-muted dark:text-dark-muted">
            Signed in as <span className="font-medium text-ink dark:text-dark-ink">{user?.email}</span>
          </p>

          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          {success ? <p className="text-sm text-green-700 dark:text-green-400">{success}</p> : null}

          <div className="flex gap-3">
            <Link to="/">
              <Button variant="outline" type="button">
                Back
              </Button>
            </Link>
            <Button 
              className="flex-1" 
              type="submit" 
              disabled={submitting || processingPayment || !date}
            >
              {processingPayment 
                ? "Redirecting to payment…" 
                : submitting 
                  ? "Creating booking…" 
                  : totalPrice > 0 
                    ? `Pay ${formatPrice(totalPrice)} & Book` 
                    : "Book now"}
            </Button>
          </div>

          {/* Payment security note */}
          {totalPrice > 0 && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted dark:text-dark-muted">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure payment powered by Stripe
            </p>
          )}
        </form>
      </Card>

      <Card className="md:col-span-5">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink dark:text-dark-ink">Reviews</p>
            <p className="mt-1 text-sm text-muted dark:text-dark-muted">
              What guests are saying about <span className="font-medium text-ink dark:text-dark-ink">{room.title}</span>
            </p>

            <div className="mt-3">
              <StarsDisplay value={ratingSummary.avg} count={ratingSummary.count} />
            </div>

            {loadingReviews ? (
              <p className="mt-4 text-sm text-muted dark:text-dark-muted">Loading reviews…</p>
            ) : reviewsError ? (
              <p className="mt-4 whitespace-pre-wrap text-sm text-red-600 dark:text-red-400">{reviewsError}</p>
            ) : reviews.length === 0 ? (
              <p className="mt-4 text-sm text-muted dark:text-dark-muted">No reviews yet. Be the first to review this room.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-border bg-surface/40 p-4 ring-1 ring-border/40">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink dark:text-dark-ink">
                          {r.user_full_name || r.user_email || "Guest"}
                        </p>
                        <p className="text-xs text-muted dark:text-dark-muted">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <StarsDisplay value={Number(r.rating) || 0} className="sm:justify-end" />
                    </div>
                    {r.note ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-ink/90 dark:text-dark-ink/90">{r.note}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full md:w-[360px]">
            <p className="text-sm font-semibold text-ink dark:text-dark-ink">Leave a review</p>
            <p className="mt-1 text-sm text-muted dark:text-dark-muted">
              Rate this room and add a note.
            </p>

            <form className="mt-4 space-y-3" onSubmit={onSubmitReview}>
              <div className="rounded-2xl border border-border bg-surface/40 p-3 ring-1 ring-border/40">
                <p className="text-xs font-medium text-muted dark:text-dark-muted">Your rating</p>
                <StarsInput
                  value={reviewRating}
                  onChange={setReviewRating}
                  disabled={reviewSubmitting}
                  size="lg"
                  className="mt-1"
                />
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted dark:text-dark-muted">Note (optional)</span>
                <textarea
                  className={`${INPUT_STYLES} min-h-[96px] resize-none bg-surface/40 ring-1 ring-border/40`}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  disabled={reviewSubmitting}
                  placeholder="Share what you liked (or what could be improved)…"
                />
              </label>

              {reviewSuccess ? <p className="text-sm text-green-700 dark:text-green-400">{reviewSuccess}</p> : null}

              <Button type="submit" disabled={reviewSubmitting}>
                {reviewSubmitting ? "Saving…" : "Submit review"}
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
});

export default Booking;

