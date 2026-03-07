import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../redux/api.js";
import LandingHero from "./LandingHero.jsx";

const Slide = React.memo(({ banner }) => {
  const navigate = useNavigate();

  const bgStyle = {};
  if (banner.bg_type === "image" && banner.bg_image_url) {
    bgStyle.backgroundImage = `url(${banner.bg_image_url})`;
    bgStyle.backgroundSize = "cover";
    bgStyle.backgroundPosition = "center";
  } else if (banner.bg_type === "gradient") {
    bgStyle.backgroundImage = banner.bg_gradient;
  } else {
    bgStyle.backgroundColor = banner.bg_color;
  }

  const handleCta = useCallback(() => {
    if (!banner.cta_link) return;
    if (banner.cta_link.startsWith("http")) {
      window.open(banner.cta_link, "_blank");
    } else if (banner.cta_link.startsWith("#")) {
      const el = document.getElementById(banner.cta_link.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(banner.cta_link);
    }
  }, [banner.cta_link, navigate]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl"
      style={{ aspectRatio: "16/6" }}
    >
      {/* Background with opacity */}
      <div className="absolute inset-0" style={{ ...bgStyle, opacity: banner.bg_opacity }} />

      {/* Text box – positioned by percentage for responsiveness */}
      <div
        className="absolute"
        style={{
          left: `${banner.text_box_x}%`,
          top: `${banner.text_box_y}%`,
          width: `${banner.text_box_width}%`,
          color: banner.text_color,
        }}
      >
        {banner.title && (
          <h2 className="text-lg font-bold leading-tight drop-shadow-lg sm:text-2xl md:text-3xl lg:text-4xl">
            {banner.title}
          </h2>
        )}
        {banner.subtitle && (
          <p className="mt-1 text-xs leading-snug opacity-90 drop-shadow sm:mt-2 sm:text-sm md:text-base">
            {banner.subtitle}
          </p>
        )}
        {banner.cta_text && (
          <div className="mt-2 sm:mt-3">
            <button
              onClick={handleCta}
              className="inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold backdrop-blur transition hover:bg-white/30 sm:px-4 sm:py-1.5 sm:text-xs md:text-sm"
            >
              {banner.cta_text}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

const ArrowButton = ({ direction, onClick }) => (
  <button
    onClick={onClick}
    className="absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur transition hover:bg-black/50 focus:outline-none sm:p-3"
    style={{ [direction === "prev" ? "left" : "right"]: "0.75rem" }}
    aria-label={direction === "prev" ? "Previous slide" : "Next slide"}
  >
    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={direction === "prev" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
      />
    </svg>
  </button>
);

const Dots = ({ count, active, onDot }) => (
  <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 sm:bottom-4 sm:gap-2">
    {Array.from({ length: count }).map((_, i) => (
      <button
        key={i}
        onClick={() => onDot(i)}
        className={`h-1.5 rounded-full transition-all sm:h-2 ${
          i === active ? "w-6 bg-white sm:w-8" : "w-1.5 bg-white/50 sm:w-2"
        }`}
        aria-label={`Go to slide ${i + 1}`}
      />
    ))}
  </div>
);

export default function HeroSlider() {
  const [banners, setBanners] = useState(null);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api.get("/banners").then(({ data }) => {
      if (!cancelled) setBanners(data.banners || []);
    }).catch(() => {
      if (!cancelled) setBanners([]);
    });
    return () => { cancelled = true; };
  }, []);

  const count = banners?.length ?? 0;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (count > 1) {
      timerRef.current = setInterval(() => {
        setCurrent((prev) => (prev + 1) % count);
      }, 6000);
    }
  }, [count]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const goTo = useCallback((i) => { setCurrent(i); resetTimer(); }, [resetTimer]);
  const goPrev = useCallback(() => { setCurrent((p) => (p - 1 + count) % count); resetTimer(); }, [count, resetTimer]);
  const goNext = useCallback(() => { setCurrent((p) => (p + 1) % count); resetTimer(); }, [count, resetTimer]);

  // Still loading
  if (banners === null) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-border bg-surface" style={{ aspectRatio: "16/6" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  // No banners – show original hero
  if (count === 0) return <LandingHero />;

  return (
    <div className="relative">
      {/* Slides */}
      <div className="overflow-hidden rounded-3xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((b) => (
            <div key={b.id} className="w-full flex-shrink-0">
              <Slide banner={b} />
            </div>
          ))}
        </div>
      </div>

      {/* Arrows (only when > 1 banner) */}
      {count > 1 && (
        <>
          <ArrowButton direction="prev" onClick={goPrev} />
          <ArrowButton direction="next" onClick={goNext} />
          <Dots count={count} active={current} onDot={goTo} />
        </>
      )}
    </div>
  );
}
