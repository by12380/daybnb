export const BOOKING_TYPES = [
  { value: "daily", label: "Daily" },
];

// ─── Property & Place Types ─────────────────────────────────

export const PROPERTY_TYPES = [
  { value: "house", label: "House", icon: "home" },
  { value: "apartment", label: "Apartment", icon: "apartment" },
  { value: "hotel", label: "Hotel", icon: "hotel" },
];

export const PLACE_TYPES = [
  { value: "any", label: "Any type" },
  { value: "room", label: "Room" },
  { value: "entire_home", label: "Entire home" },
];

export const ROOM_TYPES = [
  { value: "room", label: "Room" },
  { value: "suite", label: "Suite" },
  { value: "studio", label: "Studio" },
  { value: "villa", label: "Villa" },
  { value: "resort", label: "Resort" },
];

// ─── Booking Options ────────────────────────────────────────

export const BOOKING_OPTIONS = [
  { value: "instant_book", label: "Instant Book" },
  { value: "self_checkin", label: "Self check-in" },
  { value: "allows_pets", label: "Allows pets" },
];

// ─── Standout Stays ─────────────────────────────────────────

export const STANDOUT_STAYS = [
  { value: "is_guest_favorite", label: "Guest favorite" },
  { value: "is_luxe", label: "Luxe" },
];

// ─── Amenities (grouped) ───────────────────────────────────

export const AMENITY_GROUPS = [
  {
    label: "Popular",
    items: [
      { value: "free_parking", label: "Free parking" },
      { value: "air_conditioning", label: "Air conditioning" },
      { value: "heating", label: "Heating" },
      { value: "iron", label: "Iron" },
      { value: "hair_dryer", label: "Hair dryer" },
      { value: "dedicated_workspace", label: "Dedicated workspace" },
    ],
  },
  {
    label: "Essentials",
    items: [
      { value: "wifi", label: "Wifi" },
      { value: "kitchen", label: "Kitchen" },
      { value: "washer", label: "Washer" },
      { value: "dryer", label: "Dryer" },
      { value: "tv", label: "TV" },
    ],
  },
  {
    label: "Features",
    items: [
      { value: "pool", label: "Pool" },
      { value: "hot_tub", label: "Hot tub" },
      { value: "ev_charger", label: "EV charger" },
      { value: "crib", label: "Crib" },
      { value: "king_bed", label: "King bed" },
      { value: "gym", label: "Gym" },
      { value: "bbq_grill", label: "BBQ grill" },
      { value: "breakfast", label: "Breakfast" },
      { value: "indoor_fireplace", label: "Indoor fireplace" },
      { value: "smoking_allowed", label: "Smoking allowed" },
    ],
  },
];

export const SAFETY_FEATURES = [
  { value: "smoke_alarm", label: "Smoke alarm" },
  { value: "carbon_monoxide_alarm", label: "Carbon monoxide alarm" },
];

export const ALL_AMENITIES = AMENITY_GROUPS.flatMap((g) => g.items);
