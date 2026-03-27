import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBanners } from "../../redux/slices/offerSlice.js";
import {
  getOfferBackgroundLayerStyle,
  normalizeOfferBanner,
} from "../../lib/offerBanner.js";

const ArrowButton = React.memo(function ArrowButton({ direction, onClick }) {
  const isNext = direction === "next";

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
      aria-label={isNext ? "Next offer" : "Previous offer"}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        {isNext ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        )}
      </svg>
    </button>
  );
});

const CampaignBanner = React.memo(function CampaignBanner({ className = "" }) {
  const dispatch = useDispatch();
  const { banners } = useSelector((state) => state.offers);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    dispatch(fetchBanners());
  }, [dispatch]);

  const visibleBanners = banners || [];
  const bannerCount = visibleBanners.length;

  useEffect(() => {
    if (bannerCount <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerCount);
    }, 6000);
    return () => clearInterval(timer);
  }, [bannerCount]);

  useEffect(() => {
    if (currentIndex < bannerCount) return;
    setCurrentIndex(0);
  }, [bannerCount, currentIndex]);

  const banner = bannerCount > 0 ? visibleBanners[currentIndex % bannerCount] : null;
  const normalized = useMemo(
    () => normalizeOfferBanner(banner || {}),
    [banner]
  );
  const hasBackgroundImage =
    normalized.banner_background_type === "image" && normalized.banner_image;
  const discountLabel =
    normalized.discount_type === "percentage"
      ? `${normalized.discount_value}% OFF`
      : `$${normalized.discount_value} OFF`;

  if (bannerCount === 0 || !banner) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + bannerCount) % bannerCount);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % bannerCount);
  };

  return (
    <section
      className={`relative left-1/2 right-1/2 -mx-[50vw] w-screen ${className}`}
      aria-label="Active offers"
    >
      <div className="relative overflow-hidden bg-slate-950 text-white shadow-lg">
        <div
          className="absolute inset-0"
          style={getOfferBackgroundLayerStyle(normalized)}
        >
          {hasBackgroundImage ? (
            <img
              src={normalized.banner_image}
              alt={normalized.title || "Offer banner background"}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="absolute inset-0 bg-slate-950/60" />

        <div className="relative mx-auto flex min-h-[88px] w-full max-w-7xl items-center gap-3 px-4 py-3 sm:min-h-[96px] sm:px-6 lg:px-8">
          {bannerCount > 1 ? (
            <ArrowButton direction="prev" onClick={goToPrevious} />
          ) : (
            <div className="hidden h-9 w-9 shrink-0 sm:block" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
              <span className="rounded-full bg-white px-2.5 py-1 text-slate-900">
                {discountLabel}
              </span>
              {normalized.tag_label ? (
                <span className="rounded-full bg-white/12 px-2.5 py-1 text-white">
                  {normalized.tag_label}
                </span>
              ) : null}
            </div>

            <div className="mt-2">
              <h2 className="truncate text-sm font-semibold sm:text-base lg:text-lg">
                {normalized.title || "Special offer available now"}
              </h2>
            </div>

            {normalized.description ? (
              <p className="mt-1 truncate text-xs text-white/85 sm:text-sm">
                {normalized.description}
              </p>
            ) : null}

            {bannerCount > 1 ? (
              <div className="mt-2 flex items-center justify-center gap-1">
                {visibleBanners.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentIndex % bannerCount
                        ? "w-6 bg-white"
                        : "w-1.5 bg-white/45"
                    }`}
                    aria-label={`Go to offer ${i + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {bannerCount > 1 ? (
              <ArrowButton direction="next" onClick={goToNext} />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
});

export default CampaignBanner;
