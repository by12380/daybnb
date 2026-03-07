import React from "react";
import {
  clampHeroBoxPosition,
  getHeroBackgroundLayerStyle,
  getHeroBoxWidthPercent,
  normalizeHeroBanner,
} from "../lib/heroBanner.js";

const TEXT_ALIGN_CLASSES = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

const HeroBannerCanvas = React.memo(function HeroBannerCanvas({
  banner,
  device = "desktop",
  className = "",
  style,
  containerRef,
  onTextBoxPointerDown,
  preview = false,
}) {
  const normalized = normalizeHeroBanner(banner);
  const widthPercent = getHeroBoxWidthPercent(normalized, device);
  const position = clampHeroBoxPosition(normalized, device);
  const textAlignClass = TEXT_ALIGN_CLASSES[normalized.text_alignment] || TEXT_ALIGN_CLASSES.left;
  const hasBackgroundImage =
    normalized.background_type === "image" && normalized.background_image;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-[28px] border border-border bg-slate-950 shadow-2xl ${className}`}
      style={style}
    >
      <div
        className="absolute inset-0"
        style={getHeroBackgroundLayerStyle(normalized)}
      >
        {hasBackgroundImage ? (
          <img
            src={normalized.background_image}
            alt={normalized.title || "Hero banner background"}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/45 via-slate-950/15 to-slate-950/10" />

      <div
        className={`absolute flex max-w-full flex-col gap-3 rounded-[24px] border border-white/15 bg-slate-950/45 p-5 text-white shadow-xl backdrop-blur-md sm:gap-4 sm:p-6 ${textAlignClass} ${
          onTextBoxPointerDown ? "cursor-grab active:cursor-grabbing select-none" : ""
        }`}
        style={{
          left: `${position.left}%`,
          top: `${position.top}%`,
          width: `${widthPercent}%`,
        }}
        onPointerDown={onTextBoxPointerDown}
      >
        {normalized.badge_text ? (
          <span className="inline-flex rounded-full bg-white/16 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/90">
            {normalized.badge_text}
          </span>
        ) : null}

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-5xl">
            {normalized.title || "Your banner title"}
          </h1>
          <p className="max-w-2xl text-sm text-white/85 sm:text-base lg:text-lg">
            {normalized.subtitle || "Add a short supporting message for this hero banner."}
          </p>
        </div>

        {normalized.cta_text ? (
          preview ? (
            <span className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900">
              {normalized.cta_text}
            </span>
          ) : normalized.cta_link ? (
            <a
              href={normalized.cta_link}
              className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
            >
              {normalized.cta_text}
            </a>
          ) : null
        ) : null}

        {preview && onTextBoxPointerDown ? (
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">
            Drag the text box to reposition it
          </span>
        ) : null}
      </div>
    </div>
  );
});

export default HeroBannerCanvas;
