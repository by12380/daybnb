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
  created_at?: string;
  updated_at?: string;
}

// Transform Supabase room record to Algolia record
function transformToAlgoliaRecord(room: RoomRecord): AlgoliaRecord {
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
        // Add new record to Algolia
        if (record) {
          const algoliaRecord = transformToAlgoliaRecord(record);
          result = await saveObject(algoliaRecord);
          console.log(`Added room ${record.id} to Algolia:`, result);
        }
        break;

      case "UPDATE":
        // Update existing record in Algolia
        if (record) {
          const algoliaRecord = transformToAlgoliaRecord(record);
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
          const algoliaRecords = rooms.map(transformToAlgoliaRecord);
          
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
        // Configure Algolia index settings for GeoSearch
        result = await setSettings({
          // Searchable attributes
          searchableAttributes: [
            "title",
            "location",
            "description",
            "tags",
            "type",
          ],
          // Attributes for filtering
          attributesForFaceting: [
            "filterOnly(price_per_hour)",
            "filterOnly(guests)",
            "searchable(type)",
            "searchable(tags)",
            "searchable(location)",
          ],
          // Custom ranking
          customRanking: ["desc(price_per_hour)"],
          // Pagination
          hitsPerPage: 20,
          // Highlighting
          attributesToHighlight: ["title", "location", "description"],
          // Snippeting
          attributesToSnippet: ["description:50"],
        });
        console.log("Algolia index configured for GeoSearch:", result);
        break;

      default:
        return new Response(
          JSON.stringify({
            error: "Invalid operation type",
            validTypes: ["INSERT", "UPDATE", "DELETE", "FULL_SYNC", "CONFIGURE_INDEX"],
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
