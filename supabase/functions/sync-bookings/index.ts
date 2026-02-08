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
const algoliaIndexName =
  Deno.env.get("ALGOLIA_BOOKINGS_INDEX_NAME") || "daybnb_bookings";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface BookingRecord {
  id: string;
  room_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  total_price?: number;
  price_per_hour?: number;
  billable_hours?: number;
  user_email?: string;
  user_full_name?: string;
  user_phone?: string;
  created_at?: string;
  updated_at?: string;
}

interface AlgoliaBookingRecord {
  objectID: string;
  room_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  total_price?: number;
  price_per_hour?: number;
  billable_hours?: number;
  user_email?: string;
  user_full_name?: string;
  user_phone?: string;
  created_at?: string;
  updated_at?: string;
}

// Transform Supabase booking record to Algolia record
function transformToAlgoliaRecord(booking: BookingRecord): AlgoliaBookingRecord {
  return {
    objectID: booking.id,
    room_id: booking.room_id,
    user_id: booking.user_id,
    booking_date: booking.booking_date,
    start_time: booking.start_time,
    end_time: booking.end_time,
    status: booking.status,
    payment_status: booking.payment_status,
    payment_method: booking.payment_method,
    total_price: booking.total_price || 0,
    price_per_hour: booking.price_per_hour || 0,
    billable_hours: booking.billable_hours || 0,
    user_email: booking.user_email,
    user_full_name: booking.user_full_name,
    user_phone: booking.user_phone,
    created_at: booking.created_at,
    updated_at: booking.updated_at,
  };
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
async function saveObject(record: AlgoliaBookingRecord): Promise<unknown> {
  return algoliaRequest("PUT", `/${record.objectID}`, record);
}

// Save multiple objects to Algolia
async function saveObjects(records: AlgoliaBookingRecord[]): Promise<unknown> {
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
          details:
            "Set ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY environment variables in Supabase Edge Function secrets",
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
        if (record) {
          const algoliaRecord = transformToAlgoliaRecord(record);
          result = await saveObject(algoliaRecord);
          console.log(`Added booking ${record.id} to Algolia:`, result);
        }
        break;

      case "UPDATE":
        if (record) {
          const algoliaRecord = transformToAlgoliaRecord(record);
          result = await saveObject(algoliaRecord);
          console.log(`Updated booking ${record.id} in Algolia:`, result);
        }
        break;

      case "DELETE": {
        const recordId = old_record?.id || record?.id;
        if (recordId) {
          result = await deleteObject(recordId);
          console.log(`Deleted booking ${recordId} from Algolia:`, result);
        }
        break;
      }

      case "FULL_SYNC": {
        const { data: bookings, error: fetchError } = await supabase
          .from("bookings")
          .select("*");

        if (fetchError) {
          throw new Error(`Failed to fetch bookings: ${fetchError.message}`);
        }

        if (bookings && bookings.length > 0) {
          const algoliaRecords = bookings.map(transformToAlgoliaRecord);

          await clearObjects();
          result = await saveObjects(algoliaRecords);
          console.log(
            `Full sync completed: ${bookings.length} bookings synced to Algolia`
          );
          result = { ...result, bookingsCount: bookings.length };
        } else {
          result = { message: "No bookings to sync", bookingsCount: 0 };
        }
        break;
      }

      case "CONFIGURE_INDEX":
        result = await setSettings({
          searchableAttributes: [
            "room_id",
            "user_id",
            "booking_date",
            "start_time",
            "end_time",
            "status",
            "payment_status",
          ],
          attributesForFaceting: [
            "filterOnly(room_id)",
            "filterOnly(user_id)",
            "filterOnly(status)",
            "filterOnly(payment_status)",
            "filterOnly(payment_method)",
          ],
          customRanking: ["desc(booking_date)"],
          hitsPerPage: 20,
        });
        console.log("Algolia bookings index configured:", result);
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
    console.error("Algolia bookings sync error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to sync bookings with Algolia",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
