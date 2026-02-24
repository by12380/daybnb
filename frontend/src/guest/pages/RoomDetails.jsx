import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { StarsDisplay } from "../components/ui/Stars.jsx";
import { formatPrice } from "../utils/format.js";
import { useAuth } from "../../auth/useAuth.js";
import { fetchRoomById, clearSelectedRoom } from "../../redux/slices/roomSlice.js";
import { fetchReviewsByRoom, clearReviews } from "../../redux/slices/reviewSlice.js";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=60";

const FEATURE_LABELS = {
  wifi: "Wi-Fi",
  tv: "TV",
  ac: "Air conditioning",
  air_conditioning: "Air conditioning",
  self_checkin: "Self check-in",
  smoke_alarm: "Smoke alarm",
  carbon_monoxide_alarm: "Carbon monoxide alarm",
};

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        // Keep handling as plain comma-separated values.
      }
    }
    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeRoomImages(room) {
  const all = [];
  const append = (value) => {
    normalizeStringList(value).forEach((img) => {
      if (!all.includes(img)) all.push(img);
    });
  };

  if (room?.image) all.push(room.image);
  append(room?.images);
  append(room?.gallery_images);
  append(room?.image_gallery);
  append(room?.photos);

  return all.length ? all : [FALLBACK_IMAGE];
}

function formatFeature(value) {
  if (!value) return "";
  const key = String(value).toLowerCase();
  if (FEATURE_LABELS[key]) return FEATURE_LABELS[key];
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildMap(room) {
  const lat = Number(room?.latitude);
  const lng = Number(room?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const delta = 0.01;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
  const openMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`;
  return { embedUrl, openMapUrl };
}

const RoomDetails = React.memo(() => {
  const { roomId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { session } = useAuth();

  const { selectedRoom: room, loading: roomLoading, error: roomError } = useSelector((state) => state.rooms);
  const { reviews, loading: reviewsLoading, error: reviewsError } = useSelector((state) => state.reviews);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!roomId) return;
    dispatch(fetchRoomById(roomId));
    dispatch(fetchReviewsByRoom(roomId));
    return () => {
      dispatch(clearSelectedRoom());
      dispatch(clearReviews());
    };
  }, [dispatch, roomId]);

  const images = useMemo(() => normalizeRoomImages(room), [room]);
  const amenities = useMemo(() => normalizeStringList(room?.amenities), [room?.amenities]);
  const safetyFeatures = useMemo(() => normalizeStringList(room?.safety_features), [room?.safety_features]);
  const mapInfo = useMemo(() => buildMap(room), [room]);

  const ratingSummary = useMemo(() => {
    const list = Array.isArray(reviews) ? reviews : [];
    if (!list.length) return { avg: 0, count: 0 };
    const sum = list.reduce((acc, current) => acc + (Number(current.rating) || 0), 0);
    return { avg: sum / list.length, count: list.length };
  }, [reviews]);

  const host = room?.host || null;
  const hostName = host?.full_name || "DayBnB Host";
  const hostSince = host?.created_at
    ? new Date(host.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short" })
    : null;

  const openImage = useCallback((index) => {
    setActiveImageIndex(index);
    setViewerOpen(true);
  }, []);

  const nextImage = useCallback(() => {
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setViewerOpen(false);
      if (event.key === "ArrowRight") nextImage();
      if (event.key === "ArrowLeft") prevImage();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerOpen, nextImage, prevImage]);

  const handleReserve = useCallback(() => {
    if (!roomId) return;
    if (!session) {
      navigate(`/auth?redirect=${encodeURIComponent(`/book/${roomId}`)}`);
      return;
    }
    navigate(`/book/${roomId}`);
  }, [navigate, roomId, session]);

  if (roomLoading && !room) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Loading room details...</p>
        <p className="mt-1 text-sm text-muted">Getting gallery, amenities, and reviews.</p>
      </Card>
    );
  }

  if (roomError && !room) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink">Unable to load room</p>
        <p className="mt-1 text-sm text-red-600">{roomError}</p>
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
        <p className="mt-1 text-sm text-muted">This listing is unavailable right now.</p>
        <div className="mt-4">
          <Link to="/">
            <Button>Back to home</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-2 bg-surface p-2 dark:bg-dark-surface md:grid-cols-4">
          <button
            type="button"
            onClick={() => openImage(0)}
            className="group relative overflow-hidden rounded-2xl md:col-span-2 md:row-span-2"
          >
            <img
              src={images[0]}
              alt={room.title}
              className="h-80 w-full object-cover transition duration-300 group-hover:scale-[1.02] md:h-full"
              loading="eager"
            />
            <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white">
              {images.length} photos
            </span>
          </button>

          {images.slice(1, 5).map((image, idx) => (
            <button
              key={image}
              type="button"
              onClick={() => openImage(idx + 1)}
              className="group overflow-hidden rounded-2xl"
            >
              <img
                src={image}
                alt={`${room.title} ${idx + 2}`}
                className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Room details</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink dark:text-dark-ink">{room.title}</h1>
            <p className="mt-2 text-sm text-muted dark:text-dark-muted">
              {room.location} · Up to {room.guests || 1} guests
            </p>
            <div className="mt-3 flex items-center gap-3">
              <StarsDisplay value={ratingSummary.avg} count={ratingSummary.count} />
              {room.instant_book && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  Instant Book
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2 dark:text-dark-muted">
              <p>{room.property_type ? formatFeature(room.property_type) : "Property"} </p>
              <p>{room.place_type ? formatFeature(room.place_type) : "Private space"} </p>
              <p>{room.bedrooms || 1} bedroom(s)</p>
              <p>{room.beds || 1} bed(s)</p>
              <p>{room.bathrooms || 1} bathroom(s)</p>
              <p>{room.self_checkin ? "Self check-in available" : "Host check-in"}</p>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Amenities</h2>
            {amenities.length ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {amenities.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm text-ink dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-ink"
                  >
                    {formatFeature(feature)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted dark:text-dark-muted">No amenities listed yet.</p>
            )}

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted dark:text-dark-muted">
              Safety features
            </h3>
            {safetyFeatures.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {safetyFeatures.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-muted dark:border-dark-border dark:bg-dark-surface/70 dark:text-dark-muted"
                  >
                    {formatFeature(feature)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted dark:text-dark-muted">No safety features listed.</p>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Location</h2>
            {mapInfo ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-border dark:border-dark-border">
                <iframe
                  title={`${room.title} map`}
                  src={mapInfo.embedUrl}
                  className="h-72 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted dark:text-dark-muted">
                Exact coordinates are not available for this listing yet.
              </p>
            )}
            {mapInfo && (
              <a
                href={mapInfo.openMapUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-sm font-medium text-brand-700 hover:text-accent-500 dark:text-brand-400"
              >
                Open in map
              </a>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Hosted by {hostName}</h2>
            <p className="mt-2 text-sm text-muted dark:text-dark-muted">
              {hostSince ? `Hosting since ${hostSince}.` : "Responsive DayBnB host."}
            </p>
            {room.allows_pets && (
              <p className="mt-2 text-sm text-muted dark:text-dark-muted">Pets are welcome at this property.</p>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Reviews</h2>
              <StarsDisplay value={ratingSummary.avg} count={ratingSummary.count} />
            </div>
            {reviewsLoading ? (
              <p className="mt-4 text-sm text-muted dark:text-dark-muted">Loading reviews...</p>
            ) : reviewsError ? (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">{reviewsError}</p>
            ) : !reviews?.length ? (
              <p className="mt-4 text-sm text-muted dark:text-dark-muted">No reviews yet for this room.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-border bg-surface/40 p-4 dark:border-dark-border dark:bg-dark-surface/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink dark:text-dark-ink">
                          {review.user_full_name || review.user_email || "Guest"}
                        </p>
                        <p className="text-xs text-muted dark:text-dark-muted">
                          {review.created_at ? new Date(review.created_at).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <StarsDisplay value={Number(review.rating) || 0} />
                    </div>
                    {review.note ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-ink/90 dark:text-dark-ink/90">
                        {review.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <p className="text-2xl font-semibold text-brand-700 dark:text-brand-400">
              {formatPrice(room.price_per_day || 0)}
              <span className="text-sm font-normal text-muted dark:text-dark-muted"> / day</span>
            </p>
            <p className="mt-1 text-sm text-muted dark:text-dark-muted">No hidden fees. Final price shown at checkout.</p>

            <div className="mt-5 space-y-2">
              <Button className="w-full" onClick={handleReserve}>
                Reserve now
              </Button>
              <Link to="/" className="block">
                <Button className="w-full" variant="outline">
                  Back to search
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {viewerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <button
            type="button"
            onClick={() => setViewerOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Close gallery"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            type="button"
            onClick={prevImage}
            className="absolute left-4 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            aria-label="Previous image"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <img
            src={images[activeImageIndex]}
            alt={`${room.title} ${activeImageIndex + 1}`}
            className="max-h-[82vh] w-full max-w-5xl rounded-2xl object-contain"
          />

          <button
            type="button"
            onClick={nextImage}
            className="absolute right-4 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            aria-label="Next image"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
});

export default RoomDetails;
