import React, { useCallback, useEffect, useMemo } from "react";
import Slider from "react-slick";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import HeroBannerCanvas from "../../components/HeroBannerCanvas.jsx";
import { fetchPublicHeroBanners } from "../../redux/slices/heroBannerSlice.js";

const Arrow = React.memo(function Arrow({ className, onClick, direction }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${className} !flex !h-11 !w-11 !items-center !justify-center rounded-full !bg-panel/90 !text-ink shadow-lg backdrop-blur transition hover:!bg-panel [&::before]:content-none`}
      aria-label={direction === "next" ? "Next banner" : "Previous banner"}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        {direction === "next" ? (
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

const DefaultLandingHero = React.memo(function DefaultLandingHero({ onStartSearch, t }) {
  return (
    <div className="relative overflow rounded-3xl border border-border bg-gradient-to-br from-brand-50 via-panel to-panel px-6 py-14 shadow-2xl shadow-slate-200/60 transition-colors duration-300 dark:from-brand-600/10 dark:shadow-black/30">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-200/60 blur-3xl dark:bg-brand-500/20" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent-100 blur-3xl dark:bg-accent-500/10" />
      <div className="relative">
        <Badge tone="brand">{t("hero.badge")}</Badge>
        <h1 className="mt-4 text-4xl font-bold leading-tight text-ink md:text-5xl">
          {t("hero.title")}{" "}
          <span className="text-gradient dark:text-gradient-dark">{t("hero.titleHighlight")}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          {t("hero.subtitle")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={onStartSearch}>{t("hero.cta")}</Button>
        </div>
      </div>
    </div>
  );
});

const LandingHero = React.memo(() => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { publicBanners, publicLoaded } = useSelector((state) => state.heroBanners);

  const onStartSearch = useCallback(() => {
    const el = document.getElementById("search");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!publicLoaded) {
      dispatch(fetchPublicHeroBanners());
    }
  }, [dispatch, publicLoaded]);

  const sliderSettings = useMemo(() => {
    const showControls = publicBanners.length > 1;

    return {
      dots: showControls,
      arrows: showControls,
      infinite: showControls,
      speed: 500,
      autoplay: showControls,
      autoplaySpeed: 6000,
      pauseOnHover: true,
      slidesToShow: 1,
      slidesToScroll: 1,
      nextArrow: <Arrow direction="next" />,
      prevArrow: <Arrow direction="prev" />,
    };
  }, [publicBanners.length]);

  if (!publicLoaded || publicBanners.length === 0) {
    return <DefaultLandingHero onStartSearch={onStartSearch} t={t} />;
  }

  return (
    <div className="hero-slider">
      <Slider {...sliderSettings}>
        {publicBanners.map((banner) => (
          <div key={banner.id} className="px-1">
            <HeroBannerCanvas
              banner={banner}
              className="min-h-[360px] sm:min-h-[420px] lg:min-h-[520px]"
            />
          </div>
        ))}
      </Slider>
    </div>
  );
});

export default LandingHero;
