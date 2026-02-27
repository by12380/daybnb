import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { StarsDisplay, StarsInput } from "../components/ui/Stars.jsx";
import { formatPrice } from "../utils/format.js";
import { ALL_AMENITIES, AMENITY_GROUPS, SAFETY_FEATURES } from "../utils/constants.js";
import { useAuth } from "../../auth/useAuth.js";
import { fetchRoomById, clearSelectedRoom } from "../../redux/slices/roomSlice.js";
import { fetchReviewsByRoom, upsertReview, clearReviews, clearReviewError } from "../../redux/slices/reviewSlice.js";
import { fetchOfferForRoom, clearRoomOffer } from "../../redux/slices/offerSlice.js";
import { INPUT_STYLES } from "../components/ui/FormInput.jsx";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=60";

const AMENITY_ICONS = {
  wifi: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.07c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" /></svg>
  ),
  tv: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  ),
  kitchen: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m2 0v-4h14v4M7 9h.01M7 13h.01" /></svg>
  ),
  air_conditioning: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  ),
  heating: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
  ),
  pool: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 18c1.333-.667 2.667-.667 4 0s2.667.667 4 0 2.667-.667 4 0 2.667.667 4 0M3 22c1.333-.667 2.667-.667 4 0s2.667.667 4 0 2.667-.667 4 0 2.667.667 4 0M6 12V4m12 8V4M6 8h12" /></svg>
  ),
  hot_tub: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 18c1.333-.667 2.667-.667 4 0s2.667.667 4 0 2.667-.667 4 0 2.667.667 4 0M3 22c1.333-.667 2.667-.667 4 0s2.667.667 4 0 2.667-.667 4 0 2.667.667 4 0M12 2v4m-4-2l1 2m6-2l-1 2" /></svg>
  ),
  free_parking: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h1m6 0h1M5 21h14a2 2 0 002-2v-4a2 2 0 00-2-2l-2-5H7l-2 5a2 2 0 00-2 2v4a2 2 0 002 2zM5 13h14" /></svg>
  ),
  washer: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16a4 4 0 100-8 4 4 0 000 8zM4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm4 3h.01" /></svg>
  ),
  dryer: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16a4 4 0 100-8 4 4 0 000 8zM4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm12 3h.01" /></svg>
  ),
  iron: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 17h18M8 17l-1-4h10l3 4M7 13l1-6h8" /></svg>
  ),
  hair_dryer: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343M12 3v1m0 16v1m-8-9h1m16 0h1" /></svg>
  ),
  dedicated_workspace: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  ),
  gym: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12h3m12 0h3M7 8v8m10-8v8M9 6v12m6-12v12" /></svg>
  ),
  bbq_grill: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
  ),
  smoke_alarm: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
  ),
  carbon_monoxide_alarm: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ),
};

function getAmenityIcon(key) {
  return AMENITY_ICONS[key] || (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
  );
}

function getAmenityLabel(key) {
  const found = ALL_AMENITIES.find((a) => a.value === key) || SAFETY_FEATURES.find((a) => a.value === key);
  return found ? found.label : key.replace(/_/g, " ");
}

const CANCELLATION_LABELS = {
  flexible: { label: "Free cancellation", desc: "Cancel up to 24 hours before check-in for a full refund." },
  moderate: { label: "Moderate cancellation", desc: "Cancel up to 5 days before check-in for a full refund." },
  strict: { label: "Strict cancellation", desc: "Cancel up to 14 days before check-in for a 50% refund." },
};

function GalleryLightbox({ images, initialIndex, onClose }) {
  const [idx, setIdx] = useState(initialIndex);
  const img = images[idx];

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <div className="relative flex h-full w-full max-w-5xl items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/20">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        {images.length > 1 && (
          <>
            <button onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)} className="absolute left-4 z-10 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => setIdx((i) => (i + 1) % images.length)} className="absolute right-4 z-10 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}
        <img src={img} alt="" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
          {idx + 1} / {images.length}
        </div>
      </div>
    </div>
  );
}

const RoomDetail = React.memo(() => {
  const dispatch = useDispatch();
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { selectedRoom: room, loading: roomLoading, error: roomError } = useSelector((s) => s.rooms);
  const { reviews, loading: reviewsLoading, error: reviewsError } = useSelector((s) => s.reviews);
  const { roomOffer } = useSelector((s) => s.offers);

  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    if (roomId) {
      dispatch(fetchRoomById(roomId));
      dispatch(fetchReviewsByRoom(roomId));
      dispatch(fetchOfferForRoom(roomId));
    }
    return () => {
      dispatch(clearSelectedRoom());
      dispatch(clearReviews());
      dispatch(clearRoomOffer());
    };
  }, [dispatch, roomId]);

  const galleryImages = useMemo(() => {
    const imgs = room?.images?.length ? [...room.images] : [];
    if (room?.image && !imgs.includes(room.image)) imgs.unshift(room.image);
    return imgs.length ? imgs : [FALLBACK_IMAGE];
  }, [room?.image, room?.images]);

  const ratingSummary = useMemo(() => {
    const count = (reviews || []).length;
    if (!count) return { avg: 0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return { avg: sum / count, count };
  }, [reviews]);

  const amenities = room?.amenities || [];
  const safetyFeatures = room?.safety_features || [];
  const houseRules = room?.house_rules || [];
  const allFeatures = [...amenities, ...safetyFeatures];
  const visibleAmenities = showAllAmenities ? allFeatures : allFeatures.slice(0, 8);

  const pricePerDay = room?.price_per_day ?? 0;
  const offerPrice = useMemo(() => {
    if (!roomOffer || !pricePerDay) return null;
    let discount = 0;
    if (roomOffer.discount_type === "percentage") {
      discount = pricePerDay * (roomOffer.discount_value / 100);
    } else {
      discount = Math.min(roomOffer.discount_value, pricePerDay);
    }
    return Math.round((pricePerDay - discount) * 100) / 100;
  }, [roomOffer, pricePerDay]);

  const cancellation = CANCELLATION_LABELS[room?.cancellation_policy] || CANCELLATION_LABELS.flexible;

  const onSubmitReview = useCallback(
    async (e) => {
      e.preventDefault();
      dispatch(clearReviewError());
      setReviewSuccess("");
      setReviewError("");

      if (!user?.id) { setReviewError("You must be signed in to leave a review."); return; }
      const rating = Number(reviewRating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        setReviewError("Please select a star rating (1-5).");
        return;
      }

      setReviewSubmitting(true);
      try {
        await dispatch(upsertReview({ room_id: roomId, rating, note: reviewNote?.trim() || null })).unwrap();
        dispatch(fetchReviewsByRoom(roomId));
        setReviewSuccess("Thanks! Your review has been saved.");
        setReviewRating(0);
        setReviewNote("");
      } catch (err) {
        setReviewError(err || "Failed to save review.");
      } finally {
        setReviewSubmitting(false);
      }
    },
    [dispatch, reviewNote, reviewRating, roomId, user?.id],
  );

  if (roomLoading) {
    return (
      <div className="space-y-4">
        <div className="h-[420px] animate-pulse rounded-3xl bg-surface dark:bg-dark-surface" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            <div className="h-8 w-2/3 animate-pulse rounded-xl bg-surface dark:bg-dark-surface" />
            <div className="h-4 w-1/2 animate-pulse rounded-xl bg-surface dark:bg-dark-surface" />
            <div className="h-32 animate-pulse rounded-xl bg-surface dark:bg-dark-surface" />
          </div>
          <div className="h-64 animate-pulse rounded-3xl bg-surface dark:bg-dark-surface" />
        </div>
      </div>
    );
  }

  if (roomError && !room) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Unable to load room</p>
        <p className="mt-1 text-sm text-red-600">{roomError}</p>
        <div className="mt-4"><Link to="/"><Button>Back to home</Button></Link></div>
      </Card>
    );
  }

  if (!room) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Room not found</p>
        <p className="mt-1 text-sm text-muted">That room doesn't exist.</p>
        <div className="mt-4"><Link to="/"><Button>Back to home</Button></Link></div>
      </Card>
    );
  }

  const mapSrc = room.latitude && room.longitude
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(room.longitude) - 0.01},${Number(room.latitude) - 0.01},${Number(room.longitude) + 0.01},${Number(room.latitude) + 0.01}&layer=mapnik&marker=${room.latitude},${room.longitude}`
    : null;

  return (
    <>
      {lightboxIndex !== null && (
        <GalleryLightbox images={galleryImages} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      <div className="space-y-8">
        <section className="overflow-hidden rounded-3xl">
          {galleryImages.length === 1 ? (
            <button className="block w-full" onClick={() => setLightboxIndex(0)}>
              <img src={galleryImages[0]} alt={room.title} className="h-[420px] w-full object-cover transition hover:brightness-95" />
            </button>
          ) : galleryImages.length <= 3 ? (
            <div className="grid h-[420px] grid-cols-2 gap-1">
              <button className="relative overflow-hidden" onClick={() => setLightboxIndex(0)}>
                <img src={galleryImages[0]} alt={room.title} className="h-full w-full object-cover transition hover:brightness-95" />
              </button>
              <div className="grid grid-rows-2 gap-1">
                {galleryImages.slice(1, 3).map((img, i) => (
                  <button key={i} className="relative overflow-hidden" onClick={() => setLightboxIndex(i + 1)}>
                    <img src={img} alt="" className="h-full w-full object-cover transition hover:brightness-95" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid h-[420px] grid-cols-4 grid-rows-2 gap-1">
              <button className="col-span-2 row-span-2 relative overflow-hidden" onClick={() => setLightboxIndex(0)}>
                <img src={galleryImages[0]} alt={room.title} className="h-full w-full object-cover transition hover:brightness-95" />
              </button>
              {galleryImages.slice(1, 5).map((img, i) => (
                <button key={i} className="relative overflow-hidden" onClick={() => setLightboxIndex(i + 1)}>
                  <img src={img} alt="" className="h-full w-full object-cover transition hover:brightness-95" />
                  {i === 3 && galleryImages.length > 5 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                      <span className="text-lg font-semibold">+{galleryImages.length - 5} more</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          {galleryImages.length > 1 && (
            <div className="flex justify-end -mt-14 mr-4 relative z-10">
              <button onClick={() => setLightboxIndex(0)} className="rounded-xl border border-white/30 bg-white/90 px-4 py-2 text-sm font-semibold text-ink shadow-lg backdrop-blur transition hover:bg-white dark:bg-dark-panel/90 dark:text-dark-ink dark:hover:bg-dark-panel">
                Show all photos
              </button>
            </div>
          )}
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {room.is_guest_favorite && <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow">Guest favorite</span>}
                {room.is_luxe && <span className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-3 py-1 text-xs font-bold text-white shadow">Luxe</span>}
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink dark:text-dark-ink">{room.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted dark:text-dark-muted">
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {room.location}
                </span>
                <span>{room.guests} guest{room.guests !== 1 ? "s" : ""}</span>
                {room.bedrooms && <span>{room.bedrooms} bedroom{room.bedrooms !== 1 ? "s" : ""}</span>}
                {room.beds && <span>{room.beds} bed{room.beds !== 1 ? "s" : ""}</span>}
                {room.bathrooms && <span>{room.bathrooms} bath{room.bathrooms !== 1 ? "s" : ""}</span>}
              </div>
              <div className="mt-3"><StarsDisplay value={ratingSummary.avg} count={ratingSummary.count} /></div>
            </div>

            <hr className="border-border dark:border-dark-border" />

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-bold text-white shadow-lg">
                {(room.owner_name || room.title || "H").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-semibold text-ink dark:text-dark-ink">Hosted by {room.owner_name || "Your Host"}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {room.instant_book && <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Instant Book</span>}
                  {room.self_checkin && <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Self check-in</span>}
                  {room.allows_pets && <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">Pets allowed</span>}
                </div>
              </div>
            </div>

            <hr className="border-border dark:border-dark-border" />

            {room.description ? (
              <div>
                <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">About this place</h2>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-muted dark:text-dark-muted">{room.description}</p>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">About this place</h2>
                <p className="mt-3 leading-relaxed text-muted dark:text-dark-muted">
                  Enjoy a comfortable stay at this {room.property_type || "property"} in {room.location}.
                  {room.bedrooms && ` With ${room.bedrooms} bedroom${room.bedrooms !== 1 ? "s" : ""}`}
                  {room.beds && ` and ${room.beds} bed${room.beds !== 1 ? "s" : ""}`}
                  , it's perfect for up to {room.guests} guest{room.guests !== 1 ? "s" : ""}.
                </p>
              </div>
            )}

            <hr className="border-border dark:border-dark-border" />

            {allFeatures.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">What this place offers</h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {visibleAmenities.map((key) => (
                    <div key={key} className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3 dark:border-dark-border dark:bg-dark-surface/40">
                      <span className="shrink-0 text-brand-600 dark:text-brand-400">{getAmenityIcon(key)}</span>
                      <span className="text-sm font-medium capitalize text-ink dark:text-dark-ink">{getAmenityLabel(key)}</span>
                    </div>
                  ))}
                </div>
                {allFeatures.length > 8 && (
                  <button onClick={() => setShowAllAmenities((p) => !p)} className="mt-4 rounded-xl border border-ink px-6 py-3 text-sm font-semibold text-ink transition hover:bg-surface dark:border-dark-ink dark:text-dark-ink dark:hover:bg-dark-surface">
                    {showAllAmenities ? "Show less" : `Show all ${allFeatures.length} amenities`}
                  </button>
                )}
              </div>
            )}

            <hr className="border-border dark:border-dark-border" />

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Things to know</h2>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30">
                      <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink dark:text-dark-ink">Check-in</p>
                      <p className="text-sm text-muted dark:text-dark-muted">{room.check_in_time || "2:00 PM"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/30">
                      <svg className="h-5 w-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink dark:text-dark-ink">Check-out</p>
                      <p className="text-sm text-muted dark:text-dark-muted">{room.check_out_time || "11:00 AM"}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Cancellation policy</h2>
                <div className="mt-4 rounded-xl border border-border bg-surface/40 p-4 dark:border-dark-border dark:bg-dark-surface/40">
                  <p className="text-sm font-semibold text-ink dark:text-dark-ink">{cancellation.label}</p>
                  <p className="mt-1 text-sm text-muted dark:text-dark-muted">{cancellation.desc}</p>
                </div>
              </div>
            </div>

            {houseRules.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-ink dark:text-dark-ink">House rules</h3>
                <ul className="mt-3 space-y-2">
                  {houseRules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted dark:text-dark-muted">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      <span className="capitalize">{rule.replace(/_/g, " ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <hr className="border-border dark:border-dark-border" />

            {mapSrc && (
              <div>
                <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Where you'll be</h2>
                <p className="mt-1 text-sm text-muted dark:text-dark-muted">{room.location}{room.neighborhood ? ` — ${room.neighborhood}` : ""}</p>
                <div className="mt-4 overflow-hidden rounded-2xl border border-border dark:border-dark-border">
                  <iframe title="Location map" src={mapSrc} width="100%" height="350" className="border-0" loading="lazy" referrerPolicy="no-referrer" />
                </div>
              </div>
            )}

            <hr className="border-border dark:border-dark-border" />

            <div id="reviews">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Reviews</h2>
                <StarsDisplay value={ratingSummary.avg} count={ratingSummary.count} />
              </div>
              {reviewsLoading ? (
                <p className="mt-4 text-sm text-muted dark:text-dark-muted">Loading reviews...</p>
              ) : reviewsError ? (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">{reviewsError}</p>
              ) : reviews.length === 0 ? (
                <p className="mt-4 text-sm text-muted dark:text-dark-muted">No reviews yet. Be the first to review this place!</p>
              ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-border bg-surface/40 p-5 dark:border-dark-border dark:bg-dark-surface/40">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                          {(r.user_full_name || r.user_email || "G").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-ink dark:text-dark-ink">{r.user_full_name || r.user_email || "Guest"}</p>
                            <StarsDisplay value={Number(r.rating) || 0} />
                          </div>
                          <p className="text-xs text-muted dark:text-dark-muted">{r.created_at ? new Date(r.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : ""}</p>
                          {r.note && <p className="mt-2 text-sm leading-relaxed text-ink/80 dark:text-dark-ink/80">{r.note}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {user && (
                <div className="mt-8">
                  <h3 className="text-base font-semibold text-ink dark:text-dark-ink">Leave a review</h3>
                  <form className="mt-4 max-w-lg space-y-3" onSubmit={onSubmitReview}>
                    <div className="rounded-2xl border border-border bg-surface/40 p-3 dark:border-dark-border dark:bg-dark-surface/40">
                      <p className="text-xs font-medium text-muted dark:text-dark-muted">Your rating</p>
                      <StarsInput value={reviewRating} onChange={setReviewRating} disabled={reviewSubmitting} size="lg" className="mt-1" />
                    </div>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-muted dark:text-dark-muted">Note (optional)</span>
                      <textarea className={`${INPUT_STYLES} min-h-[96px] resize-none bg-surface/40 ring-1 ring-border/40`} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} disabled={reviewSubmitting} placeholder="Share what you liked..." />
                    </label>
                    {reviewError && <p className="text-sm text-red-600 dark:text-red-400">{reviewError}</p>}
                    {reviewSuccess && <p className="text-sm text-green-700 dark:text-green-400">{reviewSuccess}</p>}
                    <Button type="submit" disabled={reviewSubmitting}>{reviewSubmitting ? "Saving..." : "Submit review"}</Button>
                  </form>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="space-y-5">
                <div>
                  {offerPrice != null ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-brand-700 dark:text-brand-400">{formatPrice(offerPrice)}</span>
                      <span className="text-base text-muted line-through dark:text-dark-muted">{formatPrice(pricePerDay)}</span>
                      <span className="text-sm text-muted dark:text-dark-muted">/ day</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-brand-700 dark:text-brand-400">{formatPrice(pricePerDay)}</span>
                      <span className="text-sm text-muted dark:text-dark-muted">/ day</span>
                    </div>
                  )}
                </div>
                {roomOffer && (
                  <div className="rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-3 dark:border-orange-800 dark:from-orange-900/30 dark:to-amber-900/30">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      <span className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                        {roomOffer.discount_type === "percentage" ? `${roomOffer.discount_value}% Off` : `$${roomOffer.discount_value} Off`}
                        {roomOffer.title ? ` — ${roomOffer.title}` : ""}
                      </span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {room.bedrooms && (
                    <div className="rounded-xl bg-surface/60 p-3 text-center dark:bg-dark-surface/60">
                      <p className="text-lg font-bold text-ink dark:text-dark-ink">{room.bedrooms}</p>
                      <p className="text-xs text-muted dark:text-dark-muted">Bedroom{room.bedrooms !== 1 ? "s" : ""}</p>
                    </div>
                  )}
                  {room.bathrooms && (
                    <div className="rounded-xl bg-surface/60 p-3 text-center dark:bg-dark-surface/60">
                      <p className="text-lg font-bold text-ink dark:text-dark-ink">{room.bathrooms}</p>
                      <p className="text-xs text-muted dark:text-dark-muted">Bathroom{room.bathrooms !== 1 ? "s" : ""}</p>
                    </div>
                  )}
                  <div className="rounded-xl bg-surface/60 p-3 text-center dark:bg-dark-surface/60">
                    <p className="text-lg font-bold text-ink dark:text-dark-ink">{room.guests || 1}</p>
                    <p className="text-xs text-muted dark:text-dark-muted">Guest{(room.guests || 1) !== 1 ? "s" : ""}</p>
                  </div>
                  {room.beds && (
                    <div className="rounded-xl bg-surface/60 p-3 text-center dark:bg-dark-surface/60">
                      <p className="text-lg font-bold text-ink dark:text-dark-ink">{room.beds}</p>
                      <p className="text-xs text-muted dark:text-dark-muted">Bed{room.beds !== 1 ? "s" : ""}</p>
                    </div>
                  )}
                </div>
                {ratingSummary.count > 0 && (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-50/80 py-2 dark:bg-amber-900/20">
                    <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.6l2.53 5.26 5.8.84-4.2 4.1.99 5.78L10 14.9l-5.12 2.68.99-5.78-4.2-4.1 5.8-.84L10 1.6z" /></svg>
                    <span className="text-sm font-semibold text-ink dark:text-dark-ink">{ratingSummary.avg.toFixed(1)}</span>
                    <span className="text-sm text-muted dark:text-dark-muted">({ratingSummary.count} review{ratingSummary.count !== 1 ? "s" : ""})</span>
                  </div>
                )}
                <Button onClick={() => navigate(`/book/${room.id}`)} className="w-full py-3 text-base">Book Now</Button>
                <p className="text-center text-xs text-muted dark:text-dark-muted">You won't be charged yet</p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default RoomDetail;
