import { createClient } from "@supabase/supabase-js";
import { algoliasearch } from "algoliasearch";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ALGOLIA_APP_ID,
  ALGOLIA_ADMIN_API_KEY,
  ALGOLIA_ROOMS_INDEX = "daybnb_rooms",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
  console.error("Missing ALGOLIA_APP_ID / ALGOLIA_ADMIN_API_KEY in env.");
  process.exit(1);
}

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY);

const { data: rooms, error } = await supabase.from("rooms").select("*");
if (error) {
  console.error("Failed to fetch rooms from Supabase:", error);
  process.exit(1);
}

const objects = (rooms || []).map((r) => {
  const objectID = String(r.id);
  const latitude = toNumberOrNull(r.latitude);
  const longitude = toNumberOrNull(r.longitude);

  const obj = {
    objectID,
    id: objectID,
    title: r.title ?? "",
    location: r.location ?? "",
    type: r.type ?? "",
    guests: toNumberOrNull(r.guests) ?? 0,
    price_per_hour: toNumberOrNull(r.price_per_hour) ?? 0,
    image: r.image ?? null,
    tags: Array.isArray(r.tags) ? r.tags : [],
    created_at: r.created_at ?? null,
    available_start_minutes: 8 * 60,
    available_end_minutes: 17 * 60,
    latitude,
    longitude,
  };

  if (latitude !== null && longitude !== null) {
    obj._geoloc = { lat: latitude, lng: longitude };
  }

  return obj;
});

await client.saveObjects({
  indexName: ALGOLIA_ROOMS_INDEX,
  objects,
});

console.log(`Backfilled ${objects.length} rooms into Algolia index: ${ALGOLIA_ROOMS_INDEX}`);

