import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBanners } from "../../redux/slices/offerSlice.js";

const CampaignBanner = React.memo(function CampaignBanner({ className = "" }) {
  const dispatch = useDispatch();
  const { banners } = useSelector((state) => state.offers);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("dismissed_banners") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    dispatch(fetchBanners());
  }, [dispatch]);

  const visibleBanners = (banners || []).filter((b) => !dismissed.includes(b.id));

  useEffect(() => {
    if (visibleBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [visibleBanners.length]);

  if (visibleBanners.length === 0) return null;

  const banner = visibleBanners[currentIndex % visibleBanners.length];
  if (!banner) return null;

  const handleDismiss = () => {
    const next = [...dismissed, banner.id];
    setDismissed(next);
    try { sessionStorage.setItem("dismissed_banners", JSON.stringify(next)); }
    catch {}
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl shadow-lg ${className}`}>
      {banner.banner_image ? (
        <div className="relative">
          <img
            src={banner.banner_image}
            alt={banner.title}
            className="h-48 w-full object-cover sm:h-56 md:h-64"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                {banner.tag_label && (
                  <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur">
                    {banner.tag_label}
                  </span>
                )}
                <h3 className="text-xl font-bold text-white sm:text-2xl">{banner.title}</h3>
                {banner.description && (
                  <p className="mt-1 text-sm text-white/80">{banner.description}</p>
                )}
                <p className="mt-2 text-lg font-bold text-white">
                  {banner.discount_type === "percentage"
                    ? `${banner.discount_value}% OFF`
                    : `$${banner.discount_value} OFF`}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative bg-gradient-to-r from-brand-600 via-purple-600 to-pink-500 p-6">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              {banner.tag_label && (
                <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  {banner.tag_label}
                </span>
              )}
              <h3 className="text-xl font-bold text-white sm:text-2xl">{banner.title}</h3>
              {banner.description && (
                <p className="mt-1 text-sm text-white/80">{banner.description}</p>
              )}
            </div>
            <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-white text-brand-600 shadow-lg">
              <span className="text-xl font-bold">
                {banner.discount_type === "percentage" ? `${banner.discount_value}%` : `$${banner.discount_value}`}
              </span>
              <span className="text-[10px] font-semibold uppercase">Off</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-full bg-black/30 p-1.5 text-white/80 backdrop-blur transition hover:bg-black/50 hover:text-white"
        aria-label="Dismiss banner"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {visibleBanners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {visibleBanners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === currentIndex % visibleBanners.length ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default CampaignBanner;
