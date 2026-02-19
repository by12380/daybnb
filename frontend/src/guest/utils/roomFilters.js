export const AMENITIES = {
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

export const PROPERTY_TYPES = ["house", "apartment", "hotel"];
export const PLACE_TYPES = ["any", "room", "entire_home"];

export const BOOKING_OPTIONS = ["instant_book", "self_checkin", "allows_pets"];
export const STANDOUT_STAYS = ["is_guest_favorite", "is_luxe"];

export const FILTER_LABELS = {
  instant_book: "Instant book",
  self_checkin: "Self check-in",
  allows_pets: "Allows pets",
  is_guest_favorite: "Guest favorite",
  is_luxe: "Luxe",
  house: "House",
  apartment: "Apartment",
  hotel: "Hotel",
  any: "Any type",
  room: "Room",
  entire_home: "Entire home",
  free_parking: "Free parking",
  air_conditioning: "Air conditioning",
  heating: "Heating",
  iron: "Iron",
  hair_dryer: "Hair dryer",
  dedicated_workspace: "Dedicated workspace",
  wifi: "Wifi",
  kitchen: "Kitchen",
  washer: "Washer",
  dryer: "Dryer",
  tv: "TV",
  pool: "Pool",
  hot_tub: "Hot tub",
  ev_charger: "EV charger",
  crib: "Crib",
  king_bed: "King bed",
  gym: "Gym",
  bbq_grill: "BBQ grill",
  breakfast: "Breakfast",
  indoor_fireplace: "Indoor fireplace",
  smoking_allowed: "Smoking allowed",
  smoke_alarm: "Smoke alarm",
  carbon_monoxide_alarm: "Carbon monoxide alarm",
};

export function toLabel(value) {
  return FILTER_LABELS[value] || value.replace(/_/g, " ");
}
