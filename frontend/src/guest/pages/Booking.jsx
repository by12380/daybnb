import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import RoomCard from "../components/RoomCard.jsx";
import FormInput, { INPUT_STYLES } from "../components/ui/FormInput.jsx";
import { StarsDisplay, StarsInput } from "../components/ui/Stars.jsx";
import { formatPrice } from "../utils/format.js";
import { useAuth } from "../../auth/useAuth.js";
import { searchClient, indexName, isAlgoliaConfigured } from "../../lib/algoliaClient.js";
import { fetchRoomById, clearSelectedRoom } from "../../redux/slices/roomSlice.js";
import {
  createBooking,
  fetchBookingById,
  fetchAvailability,
  clearBookingError,
  clearSelectedBooking,
  clearBookedDates,
} from "../../redux/slices/bookingSlice.js";
import {
  fetchReviewsByRoom,
  upsertReview,
  clearReviews,
  clearReviewError,
} from "../../redux/slices/reviewSlice.js";
import {
  createCheckoutSession,
  clearStripeError,
  resetStripeSession,
} from "../../redux/slices/stripeSlice.js";
import { fetchOfferForRoom, clearRoomOffer } from "../../redux/slices/offerSlice.js";
import AvailabilityCalendar from "../components/AvailabilityCalendar.jsx";
import { useWelcomeOffer } from "../../hooks/useWelcomeOffer.js";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=60";

function normalizeTags(value, type) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return type ? [String(type)] : [];
}

function escapeAlgoliaValue(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function mapAlgoliaHitToRoom(hit) {
  return {
    ...hit,
    id: hit.objectID,
  };
}

const MIN_RECOMMENDATIONS = 2;
const MAX_RECOMMENDATIONS = 6;

function computeReasons(hit, sourceRoom) {
  const reasons = [];

  if (hit.property_type && sourceRoom.property_type && hit.property_type === sourceRoom.property_type) {
    reasons.push("Same property type");
  }

  if (hit.location && sourceRoom.location) {
    const hitLoc = hit.location.toLowerCase().trim();
    const srcLoc = sourceRoom.location.toLowerCase().trim();
    if (hitLoc === srcLoc || hitLoc.includes(srcLoc) || srcLoc.includes(hitLoc)) {
      reasons.push("Same location");
    }
  }

  const srcLat = Number(sourceRoom.latitude);
  const srcLng = Number(sourceRoom.longitude);
  const hitLat = Number(hit._geoloc?.lat ?? hit.latitude);
  const hitLng = Number(hit._geoloc?.lng ?? hit.longitude);
  if (Number.isFinite(srcLat) && Number.isFinite(hitLat) && Number.isFinite(srcLng) && Number.isFinite(hitLng)) {
    const R = 6371;
    const dLat = ((hitLat - srcLat) * Math.PI) / 180;
    const dLng = ((hitLng - srcLng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((srcLat * Math.PI) / 180) * Math.cos((hitLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (km <= 50) reasons.push("Nearby");
  }

  const srcPrice = Number(sourceRoom.price_per_day);
  const hitPrice = Number(hit.price_per_day);
  if (srcPrice > 0 && hitPrice > 0) {
    const ratio = hitPrice / srcPrice;
    if (ratio >= 0.6 && ratio <= 1.4) reasons.push("Similar price");
  }

  if (reasons.length === 0) reasons.push("Recommended");

  return reasons;
}

const REASON_STYLES = {
  "Same property type": "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "Same location": "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Nearby": "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "Similar price": "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "Recommended": "bg-gray-50 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
};

function RecommendationBadges({ reasons }) {
  if (!reasons || reasons.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 px-4 pb-1">
      {reasons.map((r) => (
        <span key={r} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${REASON_STYLES[r] || REASON_STYLES.Recommended}`}>
          {r}
        </span>
      ))}
    </div>
  );
}

const Booking = React.memo(() => {
  const dispatch = useDispatch();
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redux state
  const { selectedRoom: room, loading: roomLoading, error: roomError } = useSelector((state) => state.rooms);
  const { bookedDates, loading: bookingLoading, error: bookingError } = useSelector((state) => state.bookings);
  const { reviews, loading: reviewsLoading, error: reviewsError } = useSelector((state) => state.reviews);
  const { sessionUrl, loading: stripeLoading, error: stripeError } = useSelector((state) => state.stripe);
  const { roomOffer } = useSelector((state) => state.offers);

  // Local form state
  const [date, setDate] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [recommendedRooms, setRecommendedRooms] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");

  const retryBookingId = searchParams.get("retry");

  // Calendar visibility state
  const [showCalendar, setShowCalendar] = useState(false);

  // Welcome offer hook
  const {
    isEligible: isWelcomeOfferEligible,
    loading: welcomeOfferLoading,
    calculateDiscountedPrice,
    discountPercent: welcomeDiscountPercent,
    refetch: refetchWelcomeOffer,
  } = useWelcomeOffer();

  // Review form state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState("");

  // Fetch room + its best offer
  useEffect(() => {
    if (roomId) {
      dispatch(fetchRoomById(roomId));
      dispatch(fetchReviewsByRoom(roomId));
      dispatch(fetchAvailability(roomId));
      dispatch(fetchOfferForRoom(roomId));
    }
    return () => {
      dispatch(clearSelectedRoom());
      dispatch(clearReviews());
      dispatch(clearBookedDates());
      dispatch(clearRoomOffer());
    };
  }, [dispatch, roomId]);

  // Prefill user info
  useEffect(() => {
    const nameFromMeta = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name || "";
    const phoneFromMeta = user?.phone || user?.user_metadata?.phone || "";
    setFullName((prev) => (prev ? prev : String(nameFromMeta || "")));
    setPhone((prev) => (prev ? prev : String(phoneFromMeta || "")));
  }, [user]);

  // Handle retry booking prefill
  useEffect(() => {
    if (retryBookingId && room) {
      dispatch(fetchBookingById(retryBookingId)).then((action) => {
        if (action.payload?.booking) {
          const data = action.payload.booking;
          if (data.payment_status !== "paid") {
            if (data.booking_date) setDate(data.booking_date);
            if (data.user_full_name) setFullName(data.user_full_name);
            if (data.user_phone) setPhone(data.user_phone);
          }
        }
      });
    }
  }, [dispatch, retryBookingId, room]);

  // Redirect to Stripe on session URL
  useEffect(() => {
    if (sessionUrl) {
      window.location.href = sessionUrl;
    }
  }, [sessionUrl]);

  const tags = useMemo(() => normalizeTags(room?.tags, room?.type), [room?.tags, room?.type]);
  const roomLat = Number(room?.latitude);
  const roomLng = Number(room?.longitude);
  const hasGeo = Number.isFinite(roomLat) && Number.isFinite(roomLng);

  const pricePerDay = room?.price_per_day ?? 0;
  const originalTotalPrice = pricePerDay;

  // Calculate room-offer discount (admin/owner offers)
  const roomOfferInfo = useMemo(() => {
    if (!roomOffer || !pricePerDay) return { hasDiscount: false, discountedPrice: pricePerDay, discountAmount: 0 };
    let discountAmount = 0;
    if (roomOffer.discount_type === "percentage") {
      discountAmount = pricePerDay * (roomOffer.discount_value / 100);
    } else {
      discountAmount = Math.min(roomOffer.discount_value, pricePerDay);
    }
    discountAmount = Math.round(discountAmount * 100) / 100;
    return {
      hasDiscount: discountAmount > 0,
      discountedPrice: Math.round((pricePerDay - discountAmount) * 100) / 100,
      discountAmount,
      discountType: roomOffer.discount_type,
      discountValue: roomOffer.discount_value,
      title: roomOffer.title,
      tagLabel: roomOffer.tag_label,
    };
  }, [roomOffer, pricePerDay]);

  // Apply welcome offer on top of any room offer
  const afterRoomOffer = roomOfferInfo.hasDiscount ? roomOfferInfo.discountedPrice : originalTotalPrice;

  const priceInfo = useMemo(() => {
    return calculateDiscountedPrice(afterRoomOffer);
  }, [calculateDiscountedPrice, afterRoomOffer]);

  const totalPrice = priceInfo.discountedPrice;

  // Check if selected date is booked
  const isDateBooked = useMemo(() => {
    return date && (bookedDates || []).includes(date);
  }, [date, bookedDates]);

  const onDateChange = useCallback((_, dateString) => {
    setDate(dateString || "");
    setSuccess("");
    setError("");
  }, []);

  const handleCalendarDateSelect = useCallback((dateString) => {
    setDate(dateString);
    setSuccess("");
    setError("");
  }, []);

  const toggleCalendar = useCallback(() => setShowCalendar((prev) => !prev), []);
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
      dispatch(clearReviewError());
      setReviewSuccess("");

      if (!user?.id) { setError("You must be signed in to leave a review."); return; }
      const rating = Number(reviewRating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        setError("Please select a star rating (1-5).");
        return;
      }

      setReviewSubmitting(true);
      try {
        await dispatch(upsertReview({ room_id: roomId, rating, note: reviewNote?.trim() || null })).unwrap();
        dispatch(fetchReviewsByRoom(roomId));
        setReviewSuccess("Thanks! Your review has been saved.");
      } catch (err) {
        setError(err || "Failed to save review.");
      } finally {
        setReviewSubmitting(false);
      }
    },
    [dispatch, reviewNote, reviewRating, roomId, user?.id]
  );

  useEffect(() => {
    if (!room?.id || !isAlgoliaConfigured || !searchClient) {
      setRecommendedRooms([]);
      setRecommendationsError("");
      return;
    }

    let cancelled = false;

    const fetchRecommendations = async () => {
      setRecommendationsLoading(true);
      setRecommendationsError("");

      try {
        const baseFilter = `NOT objectID:${room.id}`;
        const dateFilter = date ? ` AND NOT booked_dates:${date}` : "";
        const exclude = baseFilter + dateFilter;

        const queries = [];

        // Query 1: Same property type
        if (room.property_type) {
          queries.push({
            indexName,
            query: "",
            params: {
              hitsPerPage: MAX_RECOMMENDATIONS,
              filters: `${exclude} AND property_type:"${escapeAlgoliaValue(room.property_type)}"`,
              aroundLatLng: hasGeo ? `${roomLat}, ${roomLng}` : undefined,
              aroundRadius: hasGeo ? 100000 : undefined,
            },
          });
        }

        // Query 2: Same location (text search on location field)
        if (room.location) {
          queries.push({
            indexName,
            query: room.location,
            params: {
              hitsPerPage: MAX_RECOMMENDATIONS,
              filters: exclude,
              restrictSearchableAttributes: ["location"],
            },
          });
        }

        // Query 3: Nearby (geo only, broad)
        if (hasGeo) {
          queries.push({
            indexName,
            query: "",
            params: {
              hitsPerPage: MAX_RECOMMENDATIONS,
              filters: exclude,
              aroundLatLng: `${roomLat}, ${roomLng}`,
              aroundRadius: 80000,
            },
          });
        }

        // Query 4: Broad fallback (no type/geo filter, just exclude current room)
        queries.push({
          indexName,
          query: room.title || "",
          params: {
            hitsPerPage: MAX_RECOMMENDATIONS,
            filters: exclude,
          },
        });

        const response = await searchClient.search(queries);
        const allResults = (response?.results || []).flatMap((r) => r.hits || []);

        // Deduplicate by objectID, keep first occurrence (higher-priority query wins)
        const seen = new Set();
        const uniqueHits = [];
        for (const hit of allResults) {
          if (!hit.objectID || hit.objectID === room.id || seen.has(hit.objectID)) continue;
          seen.add(hit.objectID);
          uniqueHits.push(hit);
          if (uniqueHits.length >= MAX_RECOMMENDATIONS) break;
        }

        const withReasons = uniqueHits.map((hit) => ({
          room: mapAlgoliaHitToRoom(hit),
          reasons: computeReasons(hit, room),
        }));

        if (!cancelled) {
          setRecommendedRooms(withReasons);
        }
      } catch (err) {
        if (!cancelled) {
          setRecommendedRooms([]);
          setRecommendationsError(err?.message || "Failed to load recommendations.");
        }
      } finally {
        if (!cancelled) {
          setRecommendationsLoading(false);
        }
      }
    };

    fetchRecommendations();

    return () => {
      cancelled = true;
    };
  }, [
    date,
    hasGeo,
    room?.id,
    room?.location,
    room?.place_type,
    room?.price_per_day,
    room?.property_type,
    room?.title,
    roomLat,
    roomLng,
  ]);

  const validate = useCallback(() => {
    if (!roomId) return "Missing room id.";
    if (!user?.id) return "You must be signed in to book.";
    if (!date) return "Please select a date.";
    if (isDateBooked) return "This date is already booked. Please select another date.";
    return "";
  }, [date, roomId, user?.id, isDateBooked]);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setSuccess("");

      const message = validate();
      if (message) { setError(message); return; }

      setSubmitting(true);
      setError("");

      const isOnlinePayment = paymentMethod === "online" && totalPrice > 0;

      try {
        const bookingPayload = {
            room_id: roomId,
            booking_date: date,
            user_full_name: fullName?.trim() || null,
            user_phone: phone?.trim() || null,
            total_price: totalPrice > 0 ? totalPrice : null,
            price_per_day: pricePerDay > 0 ? pricePerDay : null,
            payment_method: paymentMethod,
        };

        // Only include discount fields when a discount is actually applied
        if (priceInfo.hasDiscount && priceInfo.discountAmount > 0) {
            bookingPayload.original_price = priceInfo.originalPrice;
            bookingPayload.discount_amount = priceInfo.discountAmount;
            bookingPayload.discount_applied = "welcome_offer";
        }

        const result = await dispatch(createBooking(bookingPayload)).unwrap();

        const insertedBooking = result.booking;
        await refetchWelcomeOffer();

        if (isOnlinePayment && insertedBooking?.id) {
          setSuccess("Booking created! Redirecting to payment...");
          dispatch(
            createCheckoutSession({
              bookingId: insertedBooking.id,
              roomTitle: room?.title || "Room Booking",
              roomId,
              totalPrice,
              originalPrice: priceInfo.originalPrice,
              discountAmount: priceInfo.discountAmount,
              discountApplied: priceInfo.hasDiscount ? "welcome_offer" : null,
              pricePerDay,
              bookingDate: date,
              userEmail: user?.email,
              userId: user?.id,
            })
          );
        } else {
          setSuccess("Booking request submitted! You'll pay at the property. Redirecting to your bookings...");
          setTimeout(() => {
            const id = insertedBooking?.id;
            navigate(id ? `/my-bookings?highlight=${id}` : "/my-bookings");
          }, 1500);
        }
      } catch (err) {
        setError(err || "Failed to create booking.");
      } finally {
        setSubmitting(false);
      }
    },
    [date, dispatch, fullName, navigate, paymentMethod, phone, priceInfo, pricePerDay, room?.title, roomId, totalPrice, user?.email, user?.id, validate, refetchWelcomeOffer]
  );

  const displayError = error || bookingError || stripeError || roomError;

  if (roomLoading) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Loading room...</p>
        <p className="mt-1 text-sm text-muted">Fetching details.</p>
      </Card>
    );
  }

  if (displayError && !room) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Unable to load room</p>
        <p className="mt-1 text-sm text-red-600">{displayError}</p>
        <div className="mt-4"><Link to="/"><Button>Back to home</Button></Link></div>
      </Card>
    );
  }

  if (!room) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Room not found</p>
        <p className="mt-1 text-sm text-muted">That room doesn't exist. Go back to the homepage and pick another one.</p>
        <div className="mt-4"><Link to="/"><Button>Back to home</Button></Link></div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card className="md:col-span-3 overflow-hidden p-0">
        <img src={room.image || FALLBACK_IMAGE} alt={room.title} className="h-56 w-full object-cover" loading="lazy" />
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Booking</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">{room.title}</h1>
          <p className="mt-1 text-sm text-muted">{room.location} · Up to {room.guests} guests</p>
          <div className="mt-3"><StarsDisplay value={ratingSummary.avg} count={ratingSummary.count} /></div>
          {pricePerDay > 0 && (
            <p className="mt-2 text-lg font-semibold text-brand-700">
              {formatPrice(pricePerDay)}<span className="text-sm font-normal text-muted">/day</span>
            </p>
          )}
          {tags.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-border bg-surface/60 px-2 py-0.5 text-[11px] text-muted">{tag}</span>
              ))}
            </div>
          ) : null}

          {roomOfferInfo.hasDiscount && (
            <div className="mt-4 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4 dark:border-orange-800 dark:from-orange-900/30 dark:to-amber-900/30">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-800">
                  <svg className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-orange-800 dark:text-orange-200">
                      {roomOfferInfo.discountType === "percentage"
                        ? `${roomOfferInfo.discountValue}% Off`
                        : `$${roomOfferInfo.discountValue} Off`}
                      {roomOfferInfo.title ? ` — ${roomOfferInfo.title}` : ""}
                    </p>
                    {roomOfferInfo.tagLabel && (
                      <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-600 dark:bg-amber-800 dark:text-amber-300">
                        {roomOfferInfo.tagLabel}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-orange-700 dark:text-orange-300">
                    Special offer applied to this room. Discount reflected in the price below.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="md:col-span-2">
        {/* Welcome Offer Banner */}
        {isWelcomeOfferEligible && !welcomeOfferLoading && (
          <div className="mb-4 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 dark:border-green-800 dark:from-green-900/30 dark:to-emerald-900/30">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-800">
                <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200">Welcome Offer: {welcomeDiscountPercent}% Off!</p>
                <p className="mt-0.5 text-sm text-green-700 dark:text-green-300">As a new user, enjoy {welcomeDiscountPercent}% off your first booking. This offer is automatically applied!</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm font-semibold text-ink">Book your daytime stay</p>
        <p className="mt-1 text-sm text-muted">Select a <span className="font-medium text-ink">date</span> for your booking.</p>

        {/* Calendar Toggle */}
        <button type="button" onClick={toggleCalendar} className="mt-3 flex w-full items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-left transition hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/30 dark:hover:bg-brand-900/50">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-brand-700 dark:text-brand-300">{showCalendar ? "Hide Availability Calendar" : "View Availability Calendar"}</span>
          </div>
          <svg className={`h-5 w-5 text-brand-600 transition-transform dark:text-brand-400 ${showCalendar ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showCalendar && (
          <div className="mt-4 rounded-xl border border-border bg-panel p-4 dark:border-dark-border dark:bg-dark-panel">
            <AvailabilityCalendar roomId={roomId} selectedDate={date} onDateSelect={handleCalendarDateSelect} />
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={onSubmit} noValidate>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Date</span>
            <DatePicker className={INPUT_STYLES} placeholder="Select date" value={date ? dayjs(date) : null} onChange={onDateChange} disabledDate={(current) => current && current < dayjs().startOf("day")} />
          </label>

          {/* Date booked warning */}
          {date && isDateBooked && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">This date is already booked</p>
              <p className="mt-1 text-xs text-red-700 dark:text-red-300">Please select a different date from the calendar.</p>
            </div>
          )}

          {/* Date available */}
          {date && !isDateBooked && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">Date is available</p>
              <p className="mt-1 text-xs text-green-700 dark:text-green-300">{dayjs(date).format("dddd, MMMM D, YYYY")}</p>
            </div>
          )}

          {/* Price Breakdown */}
          {date && !isDateBooked && pricePerDay > 0 ? (
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/30">
              <p className="text-sm font-semibold text-ink dark:text-dark-ink">Price Breakdown</p>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted dark:text-dark-muted">Day Rate</span>
                  <span className="font-medium text-ink dark:text-dark-ink">{formatPrice(pricePerDay)}</span>
                </div>
                {roomOfferInfo.hasDiscount && (
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      {roomOfferInfo.title || "Special Offer"} ({roomOfferInfo.discountType === "percentage" ? `${roomOfferInfo.discountValue}%` : `$${roomOfferInfo.discountValue}`} off)
                    </span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">-{formatPrice(roomOfferInfo.discountAmount)}</span>
                  </div>
                )}
                {priceInfo.hasDiscount && (
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      Welcome Offer ({priceInfo.discountPercent}% off)
                    </span>
                    <span className="font-medium text-green-600 dark:text-green-400">-{formatPrice(priceInfo.discountAmount)}</span>
                  </div>
                )}
                <div className="border-t border-brand-100 pt-2 dark:border-brand-800">
                  <div className="flex justify-between">
                    <span className="font-semibold text-ink dark:text-dark-ink">Total</span>
                    <div className="text-right">
                      {(roomOfferInfo.hasDiscount || priceInfo.hasDiscount) && <span className="mr-2 text-sm text-muted line-through dark:text-dark-muted">{formatPrice(pricePerDay)}</span>}
                      <span className="text-lg font-bold text-brand-700 dark:text-brand-400">{formatPrice(totalPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Payment Method */}
          {totalPrice > 0 && date && !isDateBooked && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted dark:text-dark-muted">Payment Method</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={`relative flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all ${paymentMethod === "online" ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/30" : "border-border bg-surface/40 hover:border-brand-200 dark:border-dark-border dark:bg-dark-surface/40 dark:hover:border-brand-700"}`}>
                  <input type="radio" name="paymentMethod" value="online" checked={paymentMethod === "online"} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      <span className="font-semibold text-ink dark:text-dark-ink">Pay Online</span>
                    </div>
                    <p className="mt-1 text-xs text-muted dark:text-dark-muted">Secure payment via Stripe. Pay now with card.</p>
                  </div>
                </label>
                <label className={`relative flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all ${paymentMethod === "cash" ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/30" : "border-border bg-surface/40 hover:border-brand-200 dark:border-dark-border dark:bg-dark-surface/40 dark:hover:border-brand-700"}`}>
                  <input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === "cash"} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      <span className="font-semibold text-ink dark:text-dark-ink">Pay at Property</span>
                    </div>
                    <p className="mt-1 text-xs text-muted dark:text-dark-muted">Pay with cash or card when you arrive.</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label="Full name (optional)" value={fullName} onChange={onFullNameChange} placeholder="Ada Lovelace" autoComplete="name" />
            <FormInput label="Phone (optional)" value={phone} onChange={onPhoneChange} placeholder="+1 (555) 123-4567" autoComplete="tel" />
          </div>

          <p className="text-xs text-muted dark:text-dark-muted">Signed in as <span className="font-medium text-ink dark:text-dark-ink">{user?.email}</span></p>

          {displayError ? <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p> : null}
          {success ? <p className="text-sm text-green-700 dark:text-green-400">{success}</p> : null}

          <div className="flex gap-3">
            <Link to="/"><Button variant="outline" type="button">Back</Button></Link>
            <Button className="flex-1" type="submit" disabled={submitting || stripeLoading || !date || isDateBooked}>
              {stripeLoading ? "Redirecting to payment..." : submitting ? "Creating booking..." : totalPrice > 0 && paymentMethod === "online" ? `Pay ${formatPrice(totalPrice)} & Book` : totalPrice > 0 && paymentMethod === "cash" ? "Book Now - Pay at Property" : "Book now"}
            </Button>
          </div>

          {totalPrice > 0 && paymentMethod === "online" && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted dark:text-dark-muted">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Secure payment powered by Stripe
            </p>
          )}
          {totalPrice > 0 && paymentMethod === "cash" && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted dark:text-dark-muted">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Payment of {formatPrice(totalPrice)} will be collected at the property
            </p>
          )}
        </form>
      </Card>

      {/* Reviews Section */}
      <Card className="md:col-span-5">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink dark:text-dark-ink">Reviews</p>
            <p className="mt-1 text-sm text-muted dark:text-dark-muted">What guests are saying about <span className="font-medium text-ink dark:text-dark-ink">{room.title}</span></p>
            <div className="mt-3"><StarsDisplay value={ratingSummary.avg} count={ratingSummary.count} /></div>

            {reviewsLoading ? (
              <p className="mt-4 text-sm text-muted dark:text-dark-muted">Loading reviews...</p>
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
                        <p className="text-sm font-semibold text-ink dark:text-dark-ink">{r.user_full_name || r.user_email || "Guest"}</p>
                        <p className="text-xs text-muted dark:text-dark-muted">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</p>
                      </div>
                      <StarsDisplay value={Number(r.rating) || 0} className="sm:justify-end" />
                    </div>
                    {r.note ? <p className="mt-3 whitespace-pre-wrap text-sm text-ink/90 dark:text-dark-ink/90">{r.note}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full md:w-[360px]">
            <p className="text-sm font-semibold text-ink dark:text-dark-ink">Leave a review</p>
            <p className="mt-1 text-sm text-muted dark:text-dark-muted">Rate this room and add a note.</p>
            <form className="mt-4 space-y-3" onSubmit={onSubmitReview}>
              <div className="rounded-2xl border border-border bg-surface/40 p-3 ring-1 ring-border/40">
                <p className="text-xs font-medium text-muted dark:text-dark-muted">Your rating</p>
                <StarsInput value={reviewRating} onChange={setReviewRating} disabled={reviewSubmitting} size="lg" className="mt-1" />
              </div>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted dark:text-dark-muted">Note (optional)</span>
                <textarea className={`${INPUT_STYLES} min-h-[96px] resize-none bg-surface/40 ring-1 ring-border/40`} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} disabled={reviewSubmitting} placeholder="Share what you liked (or what could be improved)..." />
              </label>
              {reviewSuccess ? <p className="text-sm text-green-700 dark:text-green-400">{reviewSuccess}</p> : null}
              <Button type="submit" disabled={reviewSubmitting}>{reviewSubmitting ? "Saving..." : "Submit review"}</Button>
            </form>
          </div>
        </div>
      </Card>

      {/* Recommended Rooms */}
      {isAlgoliaConfigured && (
        <Card className="md:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink dark:text-dark-ink">Similar stays you may like</p>
              <p className="mt-1 text-sm text-muted dark:text-dark-muted">
                Recommended homes based on this listing{date ? ` and availability for ${date}` : ""}.
              </p>
            </div>
          </div>

          {recommendationsLoading ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse overflow-hidden p-0">
                  <div className="h-48 bg-surface dark:bg-dark-surface" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-3/4 rounded bg-surface dark:bg-dark-surface" />
                    <div className="h-3 w-1/2 rounded bg-surface dark:bg-dark-surface" />
                    <div className="h-6 w-1/3 rounded bg-surface dark:bg-dark-surface" />
                  </div>
                </Card>
              ))}
            </div>
          ) : recommendationsError ? (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{recommendationsError}</p>
          ) : recommendedRooms.length === 0 ? (
            <p className="mt-4 text-sm text-muted dark:text-dark-muted">No similar stays found right now.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendedRooms.map(({ room: recRoom, reasons }) => (
                <div key={recRoom.id} className="flex flex-col">
                  <RoomCard room={recRoom} showLike={false} />
                  <RecommendationBadges reasons={reasons} />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
});

export default Booking;
