import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { algoliasearch } from "https://esm.sh/algoliasearch@5.47.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-daybnb-sync-secret",
};

const ALGOLIA_APP_ID = Deno.env.get("ALGOLIA_APP_ID") as string;
const ALGOLIA_ADMIN_API_KEY = Deno.env.get("ALGOLIA_ADMIN_API_KEY") as string;
const ALGOLIA_ROOMS_INDEX = (Deno.env.get("ALGOLIA_ROOMS_INDEX") as string) || "daybnb_rooms";
const DAYBNB_SYNC_SECRET = Deno.env.get("DAYBNB_SYNC_SECRET") as string;

function toNumberOrNull(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (DAYBNB_SYNC_SECRET) {
    const secret = req.headers.get("x-daybnb-sync-secret") || "";
    if (secret !== DAYBNB_SYNC_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing ALGOLIA_APP_ID / ALGOLIA_ADMIN_API_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const payload = await req.json();
    const type = String(payload?.type || payload?.eventType || "").toUpperCase();
    const table = String(payload?.table || "");

    if (table && table !== "rooms") {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const record = payload?.record || null;
    const oldRecord = payload?.old_record || payload?.oldRecord || null;

    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY);

    if (type === "DELETE") {
      const objectID = String(oldRecord?.id || record?.id || "");
      if (!objectID) {
        return new Response(JSON.stringify({ error: "Missing record id for DELETE" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await client.deleteObject({ indexName: ALGOLIA_ROOMS_INDEX, objectID });

      return new Response(JSON.stringify({ ok: true, action: "delete", objectID }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // INSERT / UPDATE -> upsert
    const objectID = String(record?.id || "");
    if (!objectID) {
      return new Response(JSON.stringify({ error: "Missing record id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const latitude = toNumberOrNull(record?.latitude);
    const longitude = toNumberOrNull(record?.longitude);

    const body: Record<string, unknown> = {
      objectID,
      id: objectID,
      title: record?.title ?? "",
      location: record?.location ?? "",
      type: record?.type ?? "",
      guests: toNumberOrNull(record?.guests) ?? 0,
      price_per_hour: toNumberOrNull(record?.price_per_hour) ?? 0,
      image: record?.image ?? null,
      tags: Array.isArray(record?.tags) ? record.tags : [],
      created_at: record?.created_at ?? null,
      // “Daybnb hours” policy – indexed to allow numeric filtering
      available_start_minutes: 8 * 60,
      available_end_minutes: 17 * 60,
      latitude,
      longitude,
    };

    if (latitude !== null && longitude !== null) {
      body._geoloc = { lat: latitude, lng: longitude };
    }

    await client.saveObject({ indexName: ALGOLIA_ROOMS_INDEX, body });

    return new Response(JSON.stringify({ ok: true, action: "upsert", objectID }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Algolia sync error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Sync failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

