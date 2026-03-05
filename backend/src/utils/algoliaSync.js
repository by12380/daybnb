const { supabaseAdmin } = require("../config/supabase");

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY;
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || "daybnb_places";
const ACTIVE_STATUSES = ["pending", "approved", "confirmed"];

function isConfigured() {
  return Boolean(ALGOLIA_APP_ID && ALGOLIA_ADMIN_KEY);
}

async function algoliaRequest(method, endpoint, body) {
  if (!isConfigured()) {
    console.warn("[algolia] Not configured — set ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY in backend/.env");
    return null;
  }

  const url = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      "X-Algolia-API-Key": ALGOLIA_ADMIN_KEY,
      "X-Algolia-Application-Id": ALGOLIA_APP_ID,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Algolia ${method} ${endpoint} → ${res.status}: ${text}`);
  }
  return res.json();
}

function toNum(v) {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toBool(v) {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  return false;
}

function toArr(v) {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}

function buildRecord(room, bookedDates = []) {
  const lat = toNum(room.latitude);
  const lng = toNum(room.longitude);

  const record = {
    objectID: room.id,
    id: room.id,
    title: room.title,
    location: room.location,
    guests: toNum(room.guests) ?? 0,
    type: room.type || undefined,
    image: room.image || undefined,
    tags: toArr(room.tags),
    price_per_day: toNum(room.price_per_day) ?? 0,
    description: room.description || undefined,
    owner_id: room.owner_id ?? null,
    booked_dates: bookedDates,
    latitude: lat,
    longitude: lng,
    property_type: room.property_type || "house",
    place_type: room.place_type || "entire_home",
    bedrooms: toNum(room.bedrooms) ?? 1,
    beds: toNum(room.beds) ?? 1,
    bathrooms: toNum(room.bathrooms) ?? 1,
    instant_book: toBool(room.instant_book),
    self_checkin: toBool(room.self_checkin),
    allows_pets: toBool(room.allows_pets),
    is_guest_favorite: toBool(room.is_guest_favorite),
    is_luxe: toBool(room.is_luxe),
    amenities: toArr(room.amenities),
    safety_features: toArr(room.safety_features),
    created_at: room.created_at || undefined,
    updated_at: room.updated_at || undefined,
  };

  if (lat != null && lng != null) {
    record._geoloc = { lat, lng };
  }

  return record;
}

async function fetchBookedDates(roomIds) {
  if (!roomIds.length || !supabaseAdmin) return {};
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("room_id, booking_date")
    .in("room_id", roomIds)
    .in("status", ACTIVE_STATUSES);
  if (error) throw new Error(error.message);

  const map = {};
  (data || []).forEach((b) => {
    if (!b.room_id || !b.booking_date) return;
    if (!map[b.room_id]) map[b.room_id] = [];
    map[b.room_id].push(b.booking_date);
  });
  return map;
}

// ─── Public API (fire-and-forget, never throws) ────────────

function safe(fn) {
  fn().catch((err) => console.warn("[algolia]", err.message));
}

exports.syncRoomInsert = function (room) {
  safe(async () => {
    const dates = await fetchBookedDates([room.id]);
    await algoliaRequest("PUT", `/${room.id}`, buildRecord(room, dates[room.id] || []));
  });
};

exports.syncRoomUpdate = function (room) {
  safe(async () => {
    const dates = await fetchBookedDates([room.id]);
    await algoliaRequest("PUT", `/${room.id}`, buildRecord(room, dates[room.id] || []));
  });
};

exports.syncRoomDelete = function (roomId) {
  safe(async () => {
    await algoliaRequest("DELETE", `/${roomId}`);
  });
};

exports.syncBookingChange = function (_type, booking, oldBooking) {
  safe(async () => {
    const roomId = booking?.room_id || oldBooking?.room_id;
    if (!roomId || !supabaseAdmin) return;

    const { data: room } = await supabaseAdmin
      .from("rooms").select("*").eq("id", roomId).maybeSingle();
    if (!room) return;

    const dates = await fetchBookedDates([roomId]);
    await algoliaRequest("PUT", `/${roomId}`, buildRecord(room, dates[roomId] || []));
  });
};

// ─── Full sync (called from admin API endpoint) ────────────

exports.fullSync = async function fullSync() {
  if (!isConfigured()) throw new Error("Algolia not configured — set ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY in backend/.env");
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured");

  const { data: rooms, error } = await supabaseAdmin.from("rooms").select("*");
  if (error) throw new Error(`Failed to fetch rooms: ${error.message}`);
  if (!rooms || rooms.length === 0) return { roomsCount: 0, message: "No rooms to sync" };

  const roomIds = rooms.map((r) => r.id).filter(Boolean);
  const dateMap = await fetchBookedDates(roomIds);

  const records = rooms.map((r) => buildRecord(r, dateMap[r.id] || []));
  const batch = records.map((r) => ({ action: "updateObject", body: r }));

  await algoliaRequest("POST", "/clear");
  const result = await algoliaRequest("POST", "/batch", { requests: batch });
  return { roomsCount: rooms.length, result };
};

exports.configureIndex = async function configureIndex() {
  if (!isConfigured()) throw new Error("Algolia not configured — set ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY in backend/.env");

  return algoliaRequest("PUT", "/settings", {
    searchableAttributes: ["title", "location", "description", "tags", "type", "amenities"],
    attributesForFaceting: [
      "filterOnly(booked_dates)", "filterOnly(id)", "filterOnly(owner_id)",
      "searchable(title)", "searchable(description)", "filterOnly(image)",
      "filterOnly(price_per_day)", "filterOnly(guests)",
      "filterOnly(latitude)", "filterOnly(longitude)",
      "filterOnly(created_at)", "filterOnly(updated_at)",
      "searchable(type)", "searchable(tags)", "searchable(location)",
      "searchable(property_type)", "searchable(place_type)",
      "filterOnly(bedrooms)", "filterOnly(beds)", "filterOnly(bathrooms)",
      "filterOnly(instant_book)", "filterOnly(self_checkin)", "filterOnly(allows_pets)",
      "filterOnly(is_guest_favorite)", "filterOnly(is_luxe)",
      "searchable(amenities)", "searchable(safety_features)",
    ],
    customRanking: ["desc(price_per_day)"],
    hitsPerPage: 20,
    attributesToHighlight: ["title", "location", "description"],
    attributesToSnippet: ["description:50"],
  });
};

exports.isConfigured = isConfigured;
