const AMENITIES = {
  popular: [
    "free_parking",
    "air_conditioning",
    "heating",
    "iron",
    "hair_dryer",
    "dedicated_workspace",
  ],
  essentials: ["wifi", "kitchen", "washer", "dryer", "tv"],
  features: [
    "pool",
    "hot_tub",
    "ev_charger",
    "crib",
    "king_bed",
    "gym",
    "bbq_grill",
    "breakfast",
    "indoor_fireplace",
    "smoking_allowed",
  ],
  safety: ["smoke_alarm", "carbon_monoxide_alarm"],
};

const PROPERTY_TYPES = ["house", "apartment", "hotel"];
const PLACE_TYPES = ["room", "entire_home"];

const BOOKING_OPTIONS = ["instant_book", "self_checkin", "allows_pets"];
const STANDOUT_STAYS = ["is_guest_favorite", "is_luxe"];

const ALL_AMENITIES = Object.values(AMENITIES).flat();

function parseStringList(value) {
  if (!value && value !== "") return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function uniq(list) {
  return [...new Set(list)];
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;
  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
}

function sanitizeAmenities(rawAmenities, rawSafetyFeatures) {
  const input = uniq([
    ...parseStringList(rawAmenities),
    ...parseStringList(rawSafetyFeatures),
  ]);

  const validAmenities = input.filter((item) => ALL_AMENITIES.includes(item));
  const safetyFeatures = validAmenities.filter((item) =>
    AMENITIES.safety.includes(item)
  );

  return { amenities: validAmenities, safetyFeatures };
}

module.exports = {
  AMENITIES,
  ALL_AMENITIES,
  PROPERTY_TYPES,
  PLACE_TYPES,
  BOOKING_OPTIONS,
  STANDOUT_STAYS,
  parseStringList,
  uniq,
  toBoolean,
  sanitizeAmenities,
};
