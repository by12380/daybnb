export const OFFER_BANNER_DEFAULTS = {
  title: "",
  description: "",
  tag_label: "",
  discount_type: "percentage",
  discount_value: 10,
  banner_image: "",
  show_banner: false,
  banner_background_type: "image",
  banner_background_color: "#dc2626",
  banner_gradient_from: "#dc2626",
  banner_gradient_to: "#9333ea",
  banner_gradient_direction: "to-r",
  banner_background_opacity: 1,
  banner_text_alignment: "left",
  banner_box_x_desktop: 6,
  banner_box_y_desktop: 16,
  banner_box_x_tablet: 5,
  banner_box_y_tablet: 10,
  banner_box_x_mobile: 4,
  banner_box_y_mobile: 6,
  banner_box_width_desktop: 44,
  banner_box_width_tablet: 58,
  banner_box_width_mobile: 90,
  room_id: "",
  owner_id: "",
  start_date: "",
  end_date: "",
  is_active: true,
};

export const OFFER_DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed Amount ($)" },
];

export const OFFER_BACKGROUND_TYPES = [
  { value: "image", label: "Background image" },
  { value: "solid", label: "Solid color" },
  { value: "gradient", label: "Color gradient" },
];

export const OFFER_TEXT_ALIGNMENTS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

export const OFFER_GRADIENT_DIRECTIONS = [
  { value: "to-r", label: "Left to right", css: "to right" },
  { value: "to-l", label: "Right to left", css: "to left" },
  { value: "to-b", label: "Top to bottom", css: "to bottom" },
  { value: "to-t", label: "Bottom to top", css: "to top" },
  { value: "to-tr", label: "Bottom left to top right", css: "to top right" },
  { value: "to-tl", label: "Bottom right to top left", css: "to top left" },
  { value: "to-br", label: "Top left to bottom right", css: "to bottom right" },
  { value: "to-bl", label: "Top right to bottom left", css: "to bottom left" },
];

export const OFFER_PREVIEW_DEVICES = [
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet" },
  { value: "mobile", label: "Mobile" },
];

export const OFFER_PREVIEW_FRAMES = {
  desktop: { width: 960, aspectRatio: "16 / 7", label: "1440 x 630" },
  tablet: { width: 720, aspectRatio: "4 / 3", label: "1024 x 768" },
  mobile: { width: 320, aspectRatio: "3 / 4", label: "390 x 520" },
};

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeOfferBanner(offer = {}) {
  return {
    ...OFFER_BANNER_DEFAULTS,
    ...offer,
    discount_value: toNumber(offer.discount_value, OFFER_BANNER_DEFAULTS.discount_value),
    banner_background_opacity: toNumber(offer.banner_background_opacity, OFFER_BANNER_DEFAULTS.banner_background_opacity),
    banner_box_x_desktop: toNumber(offer.banner_box_x_desktop, OFFER_BANNER_DEFAULTS.banner_box_x_desktop),
    banner_box_y_desktop: toNumber(offer.banner_box_y_desktop, OFFER_BANNER_DEFAULTS.banner_box_y_desktop),
    banner_box_x_tablet: toNumber(offer.banner_box_x_tablet, OFFER_BANNER_DEFAULTS.banner_box_x_tablet),
    banner_box_y_tablet: toNumber(offer.banner_box_y_tablet, OFFER_BANNER_DEFAULTS.banner_box_y_tablet),
    banner_box_x_mobile: toNumber(offer.banner_box_x_mobile, OFFER_BANNER_DEFAULTS.banner_box_x_mobile),
    banner_box_y_mobile: toNumber(offer.banner_box_y_mobile, OFFER_BANNER_DEFAULTS.banner_box_y_mobile),
    banner_box_width_desktop: toNumber(offer.banner_box_width_desktop, OFFER_BANNER_DEFAULTS.banner_box_width_desktop),
    banner_box_width_tablet: toNumber(offer.banner_box_width_tablet, OFFER_BANNER_DEFAULTS.banner_box_width_tablet),
    banner_box_width_mobile: toNumber(offer.banner_box_width_mobile, OFFER_BANNER_DEFAULTS.banner_box_width_mobile),
  };
}

export function getOfferBoxWidthPercent(offer, device = "desktop") {
  const n = normalizeOfferBanner(offer);
  if (device === "mobile") return n.banner_box_width_mobile;
  if (device === "tablet") return n.banner_box_width_tablet;
  return n.banner_box_width_desktop;
}

export function getOfferBoxPosition(offer, device = "desktop") {
  const n = normalizeOfferBanner(offer);
  if (device === "mobile") return { x: n.banner_box_x_mobile, y: n.banner_box_y_mobile };
  if (device === "tablet") return { x: n.banner_box_x_tablet, y: n.banner_box_y_tablet };
  return { x: n.banner_box_x_desktop, y: n.banner_box_y_desktop };
}

export function clampOfferBoxPosition(offer, device = "desktop") {
  const width = getOfferBoxWidthPercent(offer, device);
  const maxLeft = Math.max(0, 100 - width);
  const pos = getOfferBoxPosition(offer, device);
  return {
    left: Math.min(Math.max(pos.x, 0), maxLeft),
    top: Math.min(Math.max(pos.y, 0), 76),
  };
}

export function getOfferGradientCssDirection(direction) {
  return OFFER_GRADIENT_DIRECTIONS.find((d) => d.value === direction)?.css || "to right";
}

export function getOfferBackgroundLayerStyle(offer) {
  const n = normalizeOfferBanner(offer);
  const opacity = Math.min(Math.max(n.banner_background_opacity, 0), 1);

  if (n.banner_background_type === "solid") {
    return { backgroundColor: n.banner_background_color || OFFER_BANNER_DEFAULTS.banner_background_color, opacity };
  }
  if (n.banner_background_type === "gradient") {
    return {
      backgroundImage: `linear-gradient(${getOfferGradientCssDirection(n.banner_gradient_direction)}, ${n.banner_gradient_from || OFFER_BANNER_DEFAULTS.banner_gradient_from}, ${n.banner_gradient_to || OFFER_BANNER_DEFAULTS.banner_gradient_to})`,
      opacity,
    };
  }
  return { opacity };
}

export function getOfferPreviewFrame(device = "desktop") {
  return OFFER_PREVIEW_FRAMES[device] || OFFER_PREVIEW_FRAMES.desktop;
}
