import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBanners } from "../../redux/slices/offerSlice.js";
import OfferBannerCanvas from "../../components/OfferBannerCanvas.jsx";

const CampaignBanner = React.memo(function CampaignBanner({ className = "" }) {
  const dispatch = useDispatch();
  const { banners } = useSelector((state) => state.offers);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    dispatch(fetchBanners());
  }, [dispatch]);

  const visibleBanners = banners || [];

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

  return (
    <div className={`relative overflow-hidden rounded-2xl shadow-lg ${className}`}>
      <OfferBannerCanvas
        offer={banner}
        className="w-full"
        style={{ aspectRatio: "16 / 7", minHeight: "200px" }}
      />

      {visibleBanners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
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
