// Supabase Edge Function: confirm-checkout-session
// - Retrieves Stripe Checkout Session by id
// - If paid, updates booking status to "pending" (awaiting admin approval)
//
// Required secrets:
// - STRIPE_SECRET_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

function json(data: Json, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers":
          "authorization, x-client-info, apikey, content-type",
        "access-control-allow-methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }
  if (!stripeSecretKey) {
    return json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Missing Authorization header" }, { status: 401 });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const sessionId = body?.sessionId ? String(body.sessionId) : "";
  if (!sessionId) return json({ error: "Missing sessionId" }, { status: 400 });

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const bookingId = session?.client_reference_id || session?.metadata?.booking_id || "";
  if (!bookingId) return json({ error: "Missing booking id on session" }, { status: 400 });

  // Ensure this booking belongs to the signed-in user
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select("id,user_id,status")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr) return json({ error: bookingErr.message || "Failed to load booking" }, { status: 400 });
  if (!booking) return json({ error: "Booking not found" }, { status: 404 });
  if (booking.user_id !== user.id) return json({ error: "Forbidden" }, { status: 403 });

  const paid = session?.payment_status === "paid";
  if (!paid) {
    return json({ bookingId, paid: false, status: session?.payment_status || "unpaid" });
  }

  // Move from payment_pending -> pending (admin approval)
  // If it was already approved/pending, keep it.
  const nextStatus =
    booking.status === "payment_pending" ? "pending" : booking.status || "pending";

  const { error: updateErr } = await supabase
    .from("bookings")
    .update({ status: nextStatus })
    .eq("id", bookingId);

  if (updateErr) return json({ error: updateErr.message || "Failed to update booking" }, { status: 400 });

  return json({ bookingId, paid: true, status: nextStatus }, { headers: { "access-control-allow-origin": "*" } });
});

