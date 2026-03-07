export const HERO_BANNER_DEFAULTS = {
  title: "",
  subtitle: "",
  badge_text: "",
  cta_text: "",
  cta_link: "",
  background_type: "image",
  background_image: "",
  background_color: "#2563eb",
  gradient_from: "#2563eb",
  gradient_to: "#7c3aed",
  gradient_direction: "to-r",
  background_opacity: 1,
  text_alignment: "left",
  box_x: 8,
  box_y: 18,
  box_width_desktop: 42,
  box_width_tablet: 56,
  box_width_mobile: 88,
  sort_order: 0,
  is_active: true,
};

export const HERO_BACKGROUND_TYPES = [
  { value: "image", label: "Background image" },
  { value: "solid", label: "Solid color" },
  { value: "gradient", label: "Color gradient" },
];

export const HERO_TEXT_ALIGNMENTS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

export const HERO_GRADIENT_DIRECTIONS = [
  { value: "to-r", label: "Left to right", css: "to right" },
  { value: "to-l", label: "Right to left", css: "to left" },
  { value: "to-b", label: "Top to bottom", css: "to bottom" },
  { value: "to-t", label: "Bottom to top", css: "to top" },
  { value: "to-tr", label: "Bottom left to top right", css: "to top right" },
  { value: "to-tl", label: "Bottom right to top left", css: "to top left" },
  { value: "to-br", label: "Top left to bottom right", css: "to bottom right" },
  { value: "to-bl", label: "Top right to bottom left", css: "to bottom left" },
];

export const HERO_PREVIEW_DEVICES = [
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet" },
  { value: "mobile", label: "Mobile" },
];

export const HERO_PREVIEW_FRAMES = {
  desktop: {
    width: 960,
    aspectRatio: "12 / 5",
    label: "1440 x 600",
  },
  tablet: {
    width: 720,
    aspectRatio: "4 / 3",
    label: "1024 x 768",
  },
  mobile: {
    width: 320,
    aspectRatio: "3 / 5",
    label: "390 x 650",
  },
};

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeHeroBanner(banner = {}) {
  return {
    ...HERO_BANNER_DEFAULTS,
    ...banner,
    background_opacity: toNumber(
      banner.background_opacity,
      HERO_BANNER_DEFAULTS.background_opacity
    ),
    box_x: toNumber(banner.box_x, HERO_BANNER_DEFAULTS.box_x),
    box_y: toNumber(banner.box_y, HERO_BANNER_DEFAULTS.box_y),
    box_width_desktop: toNumber(
      banner.box_width_desktop,
      HERO_BANNER_DEFAULTS.box_width_desktop
    ),
    box_width_tablet: toNumber(
      banner.box_width_tablet,
      HERO_BANNER_DEFAULTS.box_width_tablet
    ),
    box_width_mobile: toNumber(
      banner.box_width_mobile,
      HERO_BANNER_DEFAULTS.box_width_mobile
    ),
    sort_order: toNumber(banner.sort_order, HERO_BANNER_DEFAULTS.sort_order),
  };
}

export function getHeroBoxWidthPercent(banner, device = "desktop") {
  const normalized = normalizeHeroBanner(banner);

  if (device === "mobile") return normalized.box_width_mobile;
  if (device === "tablet") return normalized.box_width_tablet;
  return normalized.box_width_desktop;
}

export function clampHeroBoxPosition(banner, device = "desktop") {
  const normalized = normalizeHeroBanner(banner);
  const width = getHeroBoxWidthPercent(normalized, device);
  const maxLeft = Math.max(0, 100 - width);

  return {
    left: Math.min(Math.max(normalized.box_x, 0), maxLeft),
    top: Math.min(Math.max(normalized.box_y, 0), 76),
  };
}

export function getHeroGradientCssDirection(direction) {
  return (
    HERO_GRADIENT_DIRECTIONS.find((item) => item.value === direction)?.css ||
    "to right"
  );
}

export function getHeroBackgroundLayerStyle(banner) {
  const normalized = normalizeHeroBanner(banner);
  const opacity = Math.min(Math.max(normalized.background_opacity, 0), 1);

  if (normalized.background_type === "solid") {
    return {
      backgroundColor: normalized.background_color || HERO_BANNER_DEFAULTS.background_color,
      opacity,
    };
  }

  if (normalized.background_type === "gradient") {
    return {
      backgroundImage: `linear-gradient(${getHeroGradientCssDirection(normalized.gradient_direction)}, ${
        normalized.gradient_from || HERO_BANNER_DEFAULTS.gradient_from
      }, ${normalized.gradient_to || HERO_BANNER_DEFAULTS.gradient_to})`,
      opacity,
    };
  }

  return { opacity };
}

export function getHeroPreviewWidth(device = "desktop") {
  if (device === "mobile") return "390px";
  if (device === "tablet") return "720px";
  return "100%";
}

export function getHeroPreviewFrame(device = "desktop") {
  return HERO_PREVIEW_FRAMES[device] || HERO_PREVIEW_FRAMES.desktop;
}
