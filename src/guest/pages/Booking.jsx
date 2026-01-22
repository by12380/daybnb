import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { DAYTIME_END, DAYTIME_START } from "../utils/constants.js";
import { formatPrice, calculateTotalPrice } from "../utils/format.js";
import { useAuth } from "../../auth/useAuth.js";
import { supabase } from "../../lib/supabaseClient.js";
import { useReviews } from "../hooks/useReviews.js";
import { useLikedRooms } from "../hooks/useLikedRooms.js";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=60";

const TIME_STEP_MINUTES = 30;
const BOOKINGS_TABLE = "bookings";

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

// Star Rating Display Component
const StarRatingDisplay = React.memo(({ rating, size = "md" }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const starSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  return (
    <div className="flex">
      {[...Array(fullStars)].map((_, i) => (
        <svg
          key={`full-${i}`}
          className={`${starSize} text-yellow-400`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {hasHalfStar && (
        <svg className={`${starSize} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="halfStarBooking">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#D1D5DB" />
            </linearGradient>
          </defs>
          <path
            fill="url(#halfStarBooking)"
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <svg
          key={`empty-${i}`}
          className={`${starSize} text-gray-300`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
});

// Interactive Star Rating Input Component
const StarRatingInput = React.memo(({ value, onChange, disabled }) => {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          className={`transition-transform ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-110"}`}
        >
          <svg
            className={`h-8 w-8 ${
              (hoverValue || value) >= star ? "text-yellow-400" : "text-gray-300"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
});

// Like Button Component for Room
const LikeButton = React.memo(({ isLiked, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-border bg-white p-2 shadow-sm transition-all hover:scale-105 hover:shadow-md"
      aria-label={isLiked ? "Remove from favorites" : "Add to favorites"}
    >
      <svg
        className={`h-5 w-5 transition-colors ${
          isLiked ? "fill-red-500 text-red-500" : "fill-transparent text-gray-600"
        }`}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
});

// Review Form Component
const ReviewForm = React.memo(({ roomId, userReview, onSubmit, submitting }) => {
  const [rating, setRating] = useState(userReview?.rating || 0);
  const [comment, setComment] = useState(userReview?.note || "");
  const [localError, setLocalError] = useState("");
  const [localSuccess, setLocalSuccess] = useState("");

  useEffect(() => {
    if (userReview) {
      setRating(userReview.rating || 0);
      setComment(userReview.note || "");
    }
  }, [userReview]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setLocalError("");
      setLocalSuccess("");

      if (rating === 0) {
        setLocalError("Please select a star rating.");
        return;
      }

      const result = await onSubmit({ rating, comment });

      if (result.error) {
        setLocalError(result.error);
      } else {
        setLocalSuccess(userReview ? "Review updated successfully!" : "Review submitted successfully!");
        setTimeout(() => setLocalSuccess(""), 3000);
      }
    },
    [rating, comment, onSubmit, userReview]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">
          {userReview ? "Update your rating" : "Rate this room"}
        </label>
        <StarRatingInput value={rating} onChange={setRating} disabled={submitting} />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-ink">
          {userReview ? "Update your review (optional)" : "Write a review (optional)"}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this room..."
          rows={3}
          disabled={submitting}
          className={`${INPUT_STYLES} resize-none`}
        />
      </div>

      {localError && <p className="text-sm text-red-600">{localError}</p>}
      {localSuccess && <p className="text-sm text-green-600">{localSuccess}</p>}

      <Button type="submit" disabled={submitting || rating === 0} className="w-full">
        {submitting ? "Saving..." : userReview ? "Update Review" : "Submit Review"}
      </Button>
    </form>
  );
});

// Single Review Card Component
const ReviewCard = React.memo(({ review }) => {
  const formattedDate = new Date(review.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const initial = review.user_full_name?.[0]?.toUpperCase() || "U";

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-semibold text-white">
            {initial}
          </div>
          <div>
            <p className="font-medium text-ink">{review.user_full_name || "Anonymous"}</p>
            <p className="text-xs text-muted">{formattedDate}</p>
          </div>
        </div>
        <StarRatingDisplay rating={review.rating} size="sm" />
      </div>
      {review.note && (
        <p className="mt-3 text-sm text-muted">{review.note}</p>
      )}
    </div>
  );
});

// Reviews Section Component
const ReviewsSection = React.memo(({ roomId, user }) => {
  const {
    reviews,
    loading,
    averageRating,
    reviewCount,
    userReview,
    submitReview,
  } = useReviews(roomId);
  const [submitting, setSubmitting] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const handleSubmitReview = useCallback(
    async (data) => {
      setSubmitting(true);
      const result = await submitReview(data);
      setSubmitting(false);
      return result;
    },
    [submitReview]
  );

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  return (
    <Card className="mt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Reviews</p>
          {reviewCount > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <StarRatingDisplay rating={averageRating} size="sm" />
              <span className="text-sm font-medium text-ink">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-sm text-muted">({reviewCount} review{reviewCount !== 1 ? "s" : ""})</span>
            </div>
          )}
        </div>
      </div>

      {/* Review Form - Only show for authenticated users */}
      {user && (
        <div className="mt-4 border-t border-border pt-4">
          <ReviewForm
            roomId={roomId}
            userReview={userReview}
            onSubmit={handleSubmitReview}
            submitting={submitting}
          />
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-slate-50 p-6 text-center">
          <svg
            className="mx-auto h-8 w-8 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          <p className="mt-2 text-sm font-medium text-ink">No reviews yet</p>
          <p className="text-xs text-muted">Be the first to review this room!</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {displayedReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
          
          {reviews.length > 3 && !showAllReviews && (
            <button
              onClick={() => setShowAllReviews(true)}
              className="w-full rounded-xl border border-border py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
            >
              Show all {reviews.length} reviews
            </button>
          )}
          
          {showAllReviews && reviews.length > 3 && (
            <button
              onClick={() => setShowAllReviews(false)}
              className="w-full rounded-xl border border-border py-2 text-sm font-medium text-muted transition hover:bg-slate-50"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </Card>
  );
});

const Booking = React.memo(() => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Like functionality
  const { isLiked, toggleLike } = useLikedRooms();

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

  // State for existing bookings on selected date
  const [dateBookings, setDateBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

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
            ? `\n\nCreate a \`${BOOKINGS_TABLE}\` table with columns: room_id (text/uuid), booking_date (date), start_time (text/time), end_time (text/time), user_id (uuid/text), user_email (text), user_full_name (text), user_phone (text).`
            : insertError?.message?.toLowerCase?.().includes("row level security") ||
                insertError?.message?.toLowerCase?.().includes("rls")
              ? `\n\nIf RLS is enabled, add an INSERT policy to \`${BOOKINGS_TABLE}\` for authenticated users.`
              : "";
        setError(`${insertError.message || "Failed to create booking."}${hint}`);
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setSuccess("Booking submitted! Redirecting to your bookings...");

      // Navigate to My Bookings page after a short delay
      setTimeout(() => {
        const bookingId = insertedData?.id;
        navigate(bookingId ? `/my-bookings?highlight=${bookingId}` : "/my-bookings");
      }, 1500);
    },
    [date, dateBookings, durationHours, endTime, fullName, navigate, phone, pricePerHour, roomId, startTime, totalPrice, user?.email, user?.id, validate]
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
      <div className="md:col-span-3 space-y-4">
        <Card className="overflow-hidden p-0">
          <div className="relative">
            <img
              src={room.image || FALLBACK_IMAGE}
              alt={room.title}
              className="h-56 w-full object-cover"
              loading="lazy"
            />
            {/* Like button on image */}
            <div className="absolute right-3 top-3">
              <LikeButton
                isLiked={isLiked(roomId)}
                onClick={() => toggleLike(roomId)}
              />
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  Booking
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-ink">{room.title}</h1>
              </div>
            </div>
            <p className="mt-1 text-sm text-muted">
              {room.location} · Up to {room.guests} guests
            </p>
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
                    className="rounded-full border border-border bg-white px-2 py-0.5 text-[11px] text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
        
        {/* Reviews Section */}
        <ReviewsSection roomId={roomId} user={user} />
      </div>

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
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
              <p className="text-sm font-semibold text-ink">Price Breakdown</p>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Duration</span>
                  <span className="font-medium text-ink">{durationText}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Hourly Rate</span>
                  <span className="font-medium text-ink">{formatPrice(pricePerHour)}/hr</span>
                </div>
                <div className="border-t border-brand-100 pt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-ink">Total</span>
                    <span className="text-lg font-bold text-brand-700">{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : durationText ? (
            <p className="text-xs text-muted">Total time: {durationText}</p>
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

          <p className="text-xs text-muted">
            Signed in as <span className="font-medium text-ink">{user?.email}</span>
          </p>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-green-700">{success}</p> : null}

          <div className="flex gap-3">
            <Link to="/">
              <Button variant="outline" type="button">
                Back
              </Button>
            </Link>
            <Button className="flex-1" type="submit" disabled={submitting || !date}>
              {submitting ? "Saving…" : "Book now"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
});

export default Booking;

