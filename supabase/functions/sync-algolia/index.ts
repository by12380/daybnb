import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Algolia configuration
const algoliaAppId = Deno.env.get("ALGOLIA_APP_ID") as string;
const algoliaAdminKey = Deno.env.get("ALGOLIA_ADMIN_KEY") as string;
const algoliaIndexName = Deno.env.get("ALGOLIA_INDEX_NAME") || "daybnb_places";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RoomRecord {
  [key: string]: unknown;
  id: string;
  title: string;
  location: string;
  guests: number;
  type?: string;
  image?: string;
  tags?: string[];
  price_per_day?: number | string;
  description?: string;
  latitude?: number | string;
  longitude?: number | string;
  owner_id?: string | null;
  property_type?: string;
  place_type?: string;
  bedrooms?: number | string;
  beds?: number | string;
  bathrooms?: number | string;
  instant_book?: boolean;
  self_checkin?: boolean;
  allows_pets?: boolean;
  is_guest_favorite?: boolean;
  is_luxe?: boolean;
  amenities?: string[];
  safety_features?: string[];
  created_at?: string;
  updated_at?: string;
}

interface AlgoliaRecord {
  [key: string]: unknown;
  objectID: string;
  id: string;
  title: string;
  location: string;
  guests: number;
  type?: string;
  image?: string;
  tags?: string[];
  price_per_day: number;
  description?: string;
  owner_id?: string | null;
  booked_dates?: string[];
  latitude?: number;
  longitude?: number;
  property_type?: string;
  place_type?: string;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  instant_book?: boolean;
  self_checkin?: boolean;
  allows_pets?: boolean;
  is_guest_favorite?: boolean;
  is_luxe?: boolean;
  amenities?: string[];
  safety_features?: string[];
  _geoloc?: {
    lat: number;
    lng: number;
  };
  created_at?: string;
  updated_at?: string;
  created_at_ts?: number;
  updated_at_ts?: number;
}

interface BookingRecord {
  id?: string;
  room_id: string;
  booking_date: string;
  status?: string;
}

const ACTIVE_BOOKING_STATUSES = ["pending", "approved", "confirmed"];

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toInteger(value: unknown, fallback: number): number {
  const parsed = toNumber(value);
  if (parsed === undefined) return fallback;
  return Math.trunc(parsed);
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  if (typeof value === "number") return value !== 0;
  return fallback;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeFacetToken(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return normalized || undefined;
}

function normalizeFacetArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => normalizeFacetToken(entry))
        .filter((entry): entry is string => Boolean(entry))
    )
  );
}

function normalizePlaceType(value: unknown): string {
  const normalized = normalizeFacetToken(value);
  if (!normalized) return "entire_home";

  if (["room", "private_room", "shared_room"].includes(normalized)) {
    return "room";
  }

  if (
    [
      "entire_home",
      "entirehome",
      "entire_place",
      "entireplace",
      "home",
    ].includes(normalized)
  ) {
    return "entire_home";
  }

  return normalized;
}

function toIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsedMs = Date.parse(value);
  if (Number.isNaN(parsedMs)) return value;
  return new Date(parsedMs).toISOString();
}

// Transform Supabase room record to Algolia record
function transformToAlgoliaRecord(
  room: RoomRecord,
  bookedDates: string[] = []
): AlgoliaRecord {
  const latitude = toNumber(room.latitude);
  const longitude = toNumber(room.longitude);
  const pricePerDay = toNumber(room.price_per_day) ?? 0;
  const createdAt = toIsoDate(room.created_at);
  const updatedAt = toIsoDate(room.updated_at);
  const createdAtTs = createdAt ? Date.parse(createdAt) : NaN;
  const updatedAtTs = updatedAt ? Date.parse(updatedAt) : NaN;

  const record: AlgoliaRecord = {
    ...(room as Record<string, unknown>),
    objectID: room.id,
    id: room.id,
    title: room.title,
    location: room.location,
    guests: toInteger(room.guests, 0),
    type: normalizeFacetToken(room.type),
    image: room.image,
    tags: normalizeStringArray(room.tags),
    price_per_day: pricePerDay,
    description: room.description,
    owner_id: room.owner_id ?? null,
    booked_dates: bookedDates,
    latitude,
    longitude,
    property_type: normalizeFacetToken(room.property_type) || "house",
    place_type: normalizePlaceType(room.place_type),
    bedrooms: toInteger(room.bedrooms, 1),
    beds: toInteger(room.beds, 1),
    bathrooms: toInteger(room.bathrooms, 1),
    instant_book: toBoolean(room.instant_book, false),
    self_checkin: toBoolean(room.self_checkin, false),
    allows_pets: toBoolean(room.allows_pets, false),
    is_guest_favorite: toBoolean(room.is_guest_favorite, false),
    is_luxe: toBoolean(room.is_luxe, false),
    amenities: normalizeFacetArray(room.amenities),
    safety_features: normalizeFacetArray(room.safety_features),
    created_at: createdAt,
    updated_at: updatedAt,
    created_at_ts: Number.isFinite(createdAtTs) ? createdAtTs : undefined,
    updated_at_ts: Number.isFinite(updatedAtTs) ? updatedAtTs : undefined,
  };

  if (latitude !== undefined && longitude !== undefined) {
    record._geoloc = {
      lat: latitude,
      lng: longitude,
    };
  }

  return record;
}

function uniqueDates(dates: string[]): string[] {
  return Array.from(new Set(dates.filter(Boolean)));
}

async function fetchBookedDatesByRoomIds(roomIds: string[]) {
  if (!roomIds.length) return {};

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("room_id, booking_date, status")
    .in("room_id", roomIds)
    .in("status", ACTIVE_BOOKING_STATUSES);

  if (error) {
    throw new Error(`Failed to fetch bookings: ${error.message}`);
  }

  const bookingsByRoom: Record<string, string[]> = {};
  (bookings || []).forEach((booking) => {
    if (!booking.room_id || !booking.booking_date) return;
    if (!bookingsByRoom[booking.room_id]) {
      bookingsByRoom[booking.room_id] = [];
    }
    bookingsByRoom[booking.room_id].push(booking.booking_date);
  });

  Object.keys(bookingsByRoom).forEach((roomId) => {
    bookingsByRoom[roomId] = uniqueDates(bookingsByRoom[roomId]);
  });

  return bookingsByRoom;
}

async function syncRoomBookings(roomId: string) {
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) {
    throw new Error(`Failed to fetch room ${roomId}: ${roomError.message}`);
  }

  if (!room) {
    return { message: `Room ${roomId} not found`, roomId };
  }

  const bookingsByRoom = await fetchBookedDatesByRoomIds([roomId]);
  const bookedDates = bookingsByRoom[roomId] || [];

  const algoliaRecord = transformToAlgoliaRecord(room, bookedDates);
  return saveObject(algoliaRecord);
}

// Algolia REST API helper
async function algoliaRequest(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<unknown> {
  const url = `https://${algoliaAppId}-dsn.algolia.net/1/indexes/${algoliaIndexName}${endpoint}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      "X-Algolia-API-Key": algoliaAdminKey,
      "X-Algolia-Application-Id": algoliaAppId,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Algolia API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Save a single object to Algolia
async function saveObject(record: AlgoliaRecord): Promise<unknown> {
  return algoliaRequest("PUT", `/${record.objectID}`, record);
}

// Save multiple objects to Algolia
async function saveObjects(records: AlgoliaRecord[]): Promise<unknown> {
  const requests = records.map((record) => ({
    action: "updateObject",
    body: record,
  }));
  return algoliaRequest("POST", "/batch", { requests });
}

// Delete an object from Algolia
async function deleteObject(objectID: string): Promise<unknown> {
  return algoliaRequest("DELETE", `/${objectID}`);
}

// Clear all objects from the index
async function clearObjects(): Promise<unknown> {
  return algoliaRequest("POST", "/clear");
}

// Set index settings
async function setSettings(settings: unknown): Promise<unknown> {
  return algoliaRequest("PUT", "/settings", settings);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, record, old_record } = await req.json();

    // Validate Algolia configuration
    if (!algoliaAppId || !algoliaAdminKey) {
      return new Response(
        JSON.stringify({
          error: "Algolia credentials not configured",
          details: "Set ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY environment variables in Supabase Edge Function secrets",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result;

    switch (type) {
      case "INSERT":
        // Add new record to Algolia
        if (record) {
          const bookingsByRoom = await fetchBookedDatesByRoomIds([record.id]);
          const algoliaRecord = transformToAlgoliaRecord(
            record,
            bookingsByRoom[record.id] || []
          );
          result = await saveObject(algoliaRecord);
          console.log(`Added room ${record.id} to Algolia:`, result);
        }
        break;

      case "UPDATE":
        // Update existing record in Algolia
        if (record) {
          const bookingsByRoom = await fetchBookedDatesByRoomIds([record.id]);
          const algoliaRecord = transformToAlgoliaRecord(
            record,
            bookingsByRoom[record.id] || []
          );
          result = await saveObject(algoliaRecord);
          console.log(`Updated room ${record.id} in Algolia:`, result);
        }
        break;

      case "DELETE":
        // Remove record from Algolia
        const recordId = old_record?.id || record?.id;
        if (recordId) {
          result = await deleteObject(recordId);
          console.log(`Deleted room ${recordId} from Algolia:`, result);
        }
        break;

      case "FULL_SYNC":
        // Full sync: fetch all rooms from Supabase and sync to Algolia
        const { data: rooms, error: fetchError } = await supabase
          .from("rooms")
          .select("*");

        if (fetchError) {
          throw new Error(`Failed to fetch rooms: ${fetchError.message}`);
        }

        if (rooms && rooms.length > 0) {
          const roomIds = rooms.map((room) => room.id).filter(Boolean);
          const bookingsByRoom = await fetchBookedDatesByRoomIds(roomIds);
          const algoliaRecords = rooms.map((room) =>
            transformToAlgoliaRecord(room, bookingsByRoom[room.id] || [])
          );
          
          // Clear existing index and add all records
          await clearObjects();
          result = await saveObjects(algoliaRecords);
          console.log(`Full sync completed: ${rooms.length} rooms synced to Algolia`);
          result = { ...result, roomsCount: rooms.length };
        } else {
          result = { message: "No rooms to sync", roomsCount: 0 };
        }
        break;

      case "CONFIGURE_INDEX":
        result = await setSettings({
          searchableAttributes: [
            "title",
            "location",
            "description",
            "tags",
            "type",
            "amenities",
          ],
          attributesForFaceting: [
            "filterOnly(booked_dates)",
            "filterOnly(id)",
            "filterOnly(owner_id)",
            "searchable(title)",
            "searchable(description)",
            "filterOnly(image)",
            "filterOnly(price_per_day)",
            "filterOnly(guests)",
            "filterOnly(latitude)",
            "filterOnly(longitude)",
            "filterOnly(created_at)",
            "filterOnly(updated_at)",
            "filterOnly(created_at_ts)",
            "filterOnly(updated_at_ts)",
            "searchable(type)",
            "searchable(tags)",
            "searchable(location)",
            "searchable(property_type)",
            "searchable(place_type)",
            "filterOnly(bedrooms)",
            "filterOnly(beds)",
            "filterOnly(bathrooms)",
            "filterOnly(instant_book)",
            "filterOnly(self_checkin)",
            "filterOnly(allows_pets)",
            "filterOnly(is_guest_favorite)",
            "filterOnly(is_luxe)",
            "searchable(amenities)",
            "searchable(safety_features)",
          ],
          customRanking: ["desc(price_per_day)"],
          hitsPerPage: 20,
          attributesToHighlight: ["title", "location", "description"],
          attributesToSnippet: ["description:50"],
        });
        console.log("Algolia index configured for GeoSearch:", result);
        break;

      case "BOOKING_INSERT":
      case "BOOKING_UPDATE":
      case "BOOKING_DELETE": {
        const bookingRecord = (record || old_record) as BookingRecord | undefined;
        const roomId = bookingRecord?.room_id;

        if (!roomId) {
          throw new Error("Missing room_id for booking sync");
        }

        const oldRoomId = (old_record as BookingRecord | undefined)?.room_id;
        if (type === "BOOKING_UPDATE" && oldRoomId && oldRoomId !== roomId) {
          await syncRoomBookings(oldRoomId);
        }

        result = await syncRoomBookings(roomId);
        console.log(`Synced booking changes for room ${roomId}:`, result);
        break;
      }

      default:
        return new Response(
          JSON.stringify({
            error: "Invalid operation type",
            validTypes: [
              "INSERT",
              "UPDATE",
              "DELETE",
              "FULL_SYNC",
              "CONFIGURE_INDEX",
              "BOOKING_INSERT",
              "BOOKING_UPDATE",
              "BOOKING_DELETE",
            ],
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(
      JSON.stringify({
        success: true,
        type,
        result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Algolia sync error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to sync with Algolia",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
