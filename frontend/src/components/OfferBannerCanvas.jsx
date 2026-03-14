import React from "react";
import {
  clampOfferBoxPosition,
  getOfferBackgroundLayerStyle,
  getOfferBoxWidthPercent,
  normalizeOfferBanner,
} from "../lib/offerBanner.js";

const TEXT_ALIGN_CLASSES = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

function useViewportDevice() {
  const [device, setDevice] = React.useState(() => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w < 640) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  });

  React.useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      setDevice(w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return device;
}

const OfferBannerCanvas = React.memo(function OfferBannerCanvas({
  offer,
  device: deviceProp,
  className = "",
  style,
  containerRef,
  onTextBoxPointerDown,
  preview = false,
}) {
  const viewportDevice = useViewportDevice();
  const device = deviceProp || viewportDevice;
  const normalized = normalizeOfferBanner(offer);
  const widthPercent = getOfferBoxWidthPercent(normalized, device);
  const position = clampOfferBoxPosition(normalized, device);
  const textAlignClass =
    TEXT_ALIGN_CLASSES[normalized.banner_text_alignment] || TEXT_ALIGN_CLASSES.left;
  const hasBackgroundImage =
    normalized.banner_background_type === "image" && normalized.banner_image;

  const discountLabel =
    normalized.discount_type === "percentage"
      ? `${normalized.discount_value}%`
      : `$${normalized.discount_value}`;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-[28px] border border-border bg-slate-950 shadow-2xl ${className}`}
      style={style}
    >
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
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 via-slate-950/20 to-slate-950/10" />

      <div
        className={`absolute flex max-w-full flex-col gap-3 rounded-[24px] border border-white/15 bg-slate-950/50 p-5 text-white shadow-xl backdrop-blur-md sm:gap-4 sm:p-6 ${textAlignClass} ${
          onTextBoxPointerDown ? "cursor-grab active:cursor-grabbing select-none" : ""
        }`}
        style={{
          left: `${position.left}%`,
          top: `${position.top}%`,
          width: `${widthPercent}%`,
        }}
        onPointerDown={onTextBoxPointerDown}
      >
        {normalized.tag_label ? (
          <span className="inline-flex rounded-full bg-white/16 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/90">
            {normalized.tag_label}
          </span>
        ) : null}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold leading-tight text-white sm:text-2xl lg:text-3xl">
              {normalized.title || "Your offer title"}
            </h2>
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-lg font-extrabold text-white sm:text-xl">
              {discountLabel} OFF
            </span>
          </div>
          {(normalized.description || !preview) && (
            <p className="max-w-xl text-sm text-white/85 sm:text-base">
              {normalized.description || "Add a description for this offer."}
            </p>
          )}
        </div>

        {preview && onTextBoxPointerDown ? (
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">
            Drag the text box to reposition it
          </span>
        ) : null}
      </div>
    </div>
  );
});

export default OfferBannerCanvas;
