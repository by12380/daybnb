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
  id: string;
  title: string;
  location: string;
  guests: number;
  type?: string;
  image?: string;
  tags?: string[];
  price_per_hour?: number;
  description?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
}

interface BookingRecord {
  id: string;
  room_id: string;
  booking_date: string;
  start_time?: string;
  end_time?: string;
  status?: string;
}

interface AlgoliaRecord {
  objectID: string;
  title: string;
  location: string;
  guests: number;
  type?: string;
  image?: string;
  tags?: string[];
  price_per_hour: number;
  description?: string;
  _geoloc?: {
    lat: number;
    lng: number;
  };
  // Booked dates as array of YYYYMMDD integers for filtering
  booked_dates: number[];
  // Booked dates as ISO strings for display
  booked_dates_iso: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all active bookings for a room and return booked dates
 * Only includes bookings with status: pending, approved, or confirmed
 * Only includes future dates (today and onwards)
 */
async function fetchBookedDatesForRoom(roomId: string): Promise<{ numeric: number[]; iso: string[] }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("booking_date")
    .eq("room_id", roomId)
    .gte("booking_date", todayStr)
    .in("status", ["pending", "approved", "confirmed"]);

  if (error) {
    console.error(`Error fetching bookings for room ${roomId}:`, error);
    return { numeric: [], iso: [] };
  }

  // Get unique dates
  const uniqueDates = [...new Set((bookings || []).map(b => b.booking_date))];
  
  // Convert to numeric format (YYYYMMDD) for Algolia filtering
  const numericDates = uniqueDates.map(date => {
    const parts = date.split('-');
    return parseInt(parts[0] + parts[1] + parts[2], 10);
  });

  return {
    numeric: numericDates.sort((a, b) => a - b),
    iso: uniqueDates.sort(),
  };
}

/**
 * Fetch all active bookings for multiple rooms
 */
async function fetchBookedDatesForRooms(roomIds: string[]): Promise<Map<string, { numeric: number[]; iso: string[] }>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("room_id, booking_date")
    .in("room_id", roomIds)
    .gte("booking_date", todayStr)
    .in("status", ["pending", "approved", "confirmed"]);

  if (error) {
    console.error("Error fetching bookings:", error);
    return new Map();
  }

  // Group by room_id
  const bookingsByRoom = new Map<string, Set<string>>();
  (bookings || []).forEach(b => {
    if (!bookingsByRoom.has(b.room_id)) {
      bookingsByRoom.set(b.room_id, new Set());
    }
    bookingsByRoom.get(b.room_id)!.add(b.booking_date);
  });

  // Convert to the expected format
  const result = new Map<string, { numeric: number[]; iso: string[] }>();
  for (const roomId of roomIds) {
    const dates = bookingsByRoom.get(roomId) || new Set();
    const uniqueDates = [...dates];
    const numericDates = uniqueDates.map(date => {
      const parts = date.split('-');
      return parseInt(parts[0] + parts[1] + parts[2], 10);
    });
    result.set(roomId, {
      numeric: numericDates.sort((a, b) => a - b),
      iso: uniqueDates.sort(),
    });
  }

  return result;
}

// Transform Supabase room record to Algolia record
function transformToAlgoliaRecord(room: RoomRecord, bookedDates?: { numeric: number[]; iso: string[] }): AlgoliaRecord {
  const record: AlgoliaRecord = {
    objectID: room.id,
    title: room.title,
    location: room.location,
    guests: room.guests,
    type: room.type,
    image: room.image,
    tags: room.tags || [],
    price_per_hour: room.price_per_hour || 0,
    description: room.description,
    booked_dates: bookedDates?.numeric || [],
    booked_dates_iso: bookedDates?.iso || [],
    created_at: room.created_at,
    updated_at: room.updated_at,
  };

  // Add geolocation if coordinates are available
  if (
    room.latitude !== undefined &&
    room.latitude !== null &&
    room.longitude !== undefined &&
    room.longitude !== null
  ) {
    record._geoloc = {
      lat: room.latitude,
      lng: room.longitude,
    };
  }

  return record;
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
        // Add new room to Algolia
        if (record) {
          const bookedDates = await fetchBookedDatesForRoom(record.id);
          const algoliaRecord = transformToAlgoliaRecord(record, bookedDates);
          result = await saveObject(algoliaRecord);
          console.log(`Added room ${record.id} to Algolia:`, result);
        }
        break;

      case "UPDATE":
        // Update existing room in Algolia
        if (record) {
          const bookedDates = await fetchBookedDatesForRoom(record.id);
          const algoliaRecord = transformToAlgoliaRecord(record, bookedDates);
          result = await saveObject(algoliaRecord);
          console.log(`Updated room ${record.id} in Algolia:`, result);
        }
        break;

      case "DELETE":
        // Remove room from Algolia
        const recordId = old_record?.id || record?.id;
        if (recordId) {
          result = await deleteObject(recordId);
          console.log(`Deleted room ${recordId} from Algolia:`, result);
        }
        break;

      case "BOOKING_INSERT":
      case "BOOKING_UPDATE":
      case "BOOKING_DELETE":
        // When a booking is created, updated, or deleted, refresh the room's booked_dates in Algolia
        const bookingRoomId = record?.room_id || old_record?.room_id;
        if (bookingRoomId) {
          // Fetch the room data
          const { data: roomData, error: roomError } = await supabase
            .from("rooms")
            .select("*")
            .eq("id", bookingRoomId)
            .single();

          if (roomError) {
            console.error(`Error fetching room ${bookingRoomId}:`, roomError);
            throw new Error(`Failed to fetch room: ${roomError.message}`);
          }

          if (roomData) {
            // Fetch updated booked dates for this room
            const bookedDates = await fetchBookedDatesForRoom(bookingRoomId);
            const algoliaRecord = transformToAlgoliaRecord(roomData, bookedDates);
            result = await saveObject(algoliaRecord);
            console.log(`Updated room ${bookingRoomId} booked_dates in Algolia (${type}):`, result);
          }
        }
        break;

      case "FULL_SYNC":
        // Full sync: fetch all rooms from Supabase and sync to Algolia with booking data
        const { data: rooms, error: fetchError } = await supabase
          .from("rooms")
          .select("*");

        if (fetchError) {
          throw new Error(`Failed to fetch rooms: ${fetchError.message}`);
        }

        if (rooms && rooms.length > 0) {
          // Fetch all booked dates for all rooms
          const roomIds = rooms.map(r => r.id);
          const allBookedDates = await fetchBookedDatesForRooms(roomIds);
          
          const algoliaRecords = rooms.map(room => {
            const bookedDates = allBookedDates.get(room.id) || { numeric: [], iso: [] };
            return transformToAlgoliaRecord(room, bookedDates);
          });
          
          // Clear existing index and add all records
          await clearObjects();
          result = await saveObjects(algoliaRecords);
          console.log(`Full sync completed: ${rooms.length} rooms synced to Algolia with booking data`);
          result = { ...result, roomsCount: rooms.length };
        } else {
          result = { message: "No rooms to sync", roomsCount: 0 };
        }
        break;

      case "CONFIGURE_INDEX":
        // Configure Algolia index settings for GeoSearch, filtering, and sorting
        result = await setSettings({
          // Searchable attributes
          searchableAttributes: [
            "title",
            "location",
            "description",
            "tags",
            "type",
          ],
          // Attributes for filtering - added booked_dates for availability filtering
          attributesForFaceting: [
            "filterOnly(price_per_hour)",
            "filterOnly(guests)",
            "filterOnly(booked_dates)",
            "searchable(type)",
            "searchable(tags)",
            "searchable(location)",
          ],
          // Custom ranking - price descending by default
          customRanking: ["desc(price_per_hour)"],
          // Pagination
          hitsPerPage: 20,
          // Highlighting
          attributesToHighlight: ["title", "location", "description"],
          // Snippeting
          attributesToSnippet: ["description:50"],
          // Replicas for sorting by price
          replicas: [
            `${algoliaIndexName}_price_asc`,
            `${algoliaIndexName}_price_desc`,
          ],
        });
        
        // Configure replica indices for price sorting
        // Price ascending replica
        const priceAscUrl = `https://${algoliaAppId}-dsn.algolia.net/1/indexes/${algoliaIndexName}_price_asc/settings`;
        await fetch(priceAscUrl, {
          method: "PUT",
          headers: {
            "X-Algolia-API-Key": algoliaAdminKey,
            "X-Algolia-Application-Id": algoliaAppId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ranking: [
              "asc(price_per_hour)",
              "typo",
              "geo",
              "words",
              "filters",
              "proximity",
              "attribute",
              "exact",
              "custom",
            ],
          }),
        });
        
        // Price descending replica
        const priceDescUrl = `https://${algoliaAppId}-dsn.algolia.net/1/indexes/${algoliaIndexName}_price_desc/settings`;
        await fetch(priceDescUrl, {
          method: "PUT",
          headers: {
            "X-Algolia-API-Key": algoliaAdminKey,
            "X-Algolia-Application-Id": algoliaAppId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ranking: [
              "desc(price_per_hour)",
              "typo",
              "geo",
              "words",
              "filters",
              "proximity",
              "attribute",
              "exact",
              "custom",
            ],
          }),
        });
        
        console.log("Algolia index configured with booking filters and price sorting replicas:", result);
        break;

      default:
        return new Response(
          JSON.stringify({
            error: "Invalid operation type",
            validTypes: [
              "INSERT", "UPDATE", "DELETE", 
              "BOOKING_INSERT", "BOOKING_UPDATE", "BOOKING_DELETE",
              "FULL_SYNC", "CONFIGURE_INDEX"
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
