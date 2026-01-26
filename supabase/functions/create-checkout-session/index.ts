// Supabase Edge Function: create-checkout-session
// - Validates the booking request
// - Inserts a booking with status "payment_pending"
// - Creates a Stripe Checkout Session and returns its URL
//
// Required secrets (Supabase dashboard → Project Settings → Functions → Secrets):
// - STRIPE_SECRET_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
//
// Optional env:
// - PUBLIC_SITE_URL (e.g. http://localhost:5173)

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

function getOrigin(req: Request) {
  const url = new URL(req.url);
  return (
    Deno.env.get("PUBLIC_SITE_URL") ||
    req.headers.get("origin") ||
    `${url.protocol}//${url.host}`
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parseTimeToMinutes(value: string) {
  const [h, m] = String(value || "0:0")
    .split(":")
    .map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return clamp(h, 0, 23) * 60 + clamp(m, 0, 59);
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
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
  if (!body) return json({ error: "Invalid JSON body" }, { status: 400 });

  const bookingId = body.bookingId ? String(body.bookingId) : "";

  let roomId = String(body.roomId || "");
  let bookingDate = String(body.date || "");
  let startTime = String(body.startTime || "");
  let endTime = String(body.endTime || "");
  let fullName = body.fullName ? String(body.fullName).trim() : null;
  let phone = body.phone ? String(body.phone).trim() : null;

  // If a bookingId is provided, create a new Checkout Session for that booking.
  if (bookingId) {
    const { data: existingBooking, error: existingBookingErr } = await supabase
      .from("bookings")
      .select("id,user_id,room_id,booking_date,start_time,end_time,user_full_name,user_phone,status,total_price,price_per_hour,billable_hours")
      .eq("id", bookingId)
      .maybeSingle();

    if (existingBookingErr) {
      return json({ error: existingBookingErr.message || "Failed to load booking" }, { status: 400 });
    }
    if (!existingBooking) return json({ error: "Booking not found" }, { status: 404 });
    if (existingBooking.user_id !== user.id) return json({ error: "Forbidden" }, { status: 403 });
    if (existingBooking.status !== "payment_pending") {
      return json({ error: "Booking is not awaiting payment" }, { status: 409 });
    }

    roomId = String(existingBooking.room_id || "");
    bookingDate = String(existingBooking.booking_date || "");
    startTime = String(existingBooking.start_time || "");
    endTime = String(existingBooking.end_time || "");
    fullName = existingBooking.user_full_name ? String(existingBooking.user_full_name) : null;
    phone = existingBooking.user_phone ? String(existingBooking.user_phone) : null;
  }

  if (!roomId) return json({ error: "Missing roomId" }, { status: 400 });
  if (!bookingDate) return json({ error: "Missing date" }, { status: 400 });
  if (!startTime || !endTime) return json({ error: "Missing start/end time" }, { status: 400 });

  const startM = parseTimeToMinutes(startTime);
  const endM = parseTimeToMinutes(endTime);
  if (endM <= startM) return json({ error: "End time must be after start time" }, { status: 400 });

  // Load room pricing (server-trusted)
  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("id,title,price_per_hour")
    .eq("id", roomId)
    .maybeSingle();

  if (roomErr) return json({ error: roomErr.message || "Failed to load room" }, { status: 400 });
  if (!room) return json({ error: "Room not found" }, { status: 404 });

  const pricePerHour = Number(room.price_per_hour) || 0;
  if (!Number.isFinite(pricePerHour) || pricePerHour <= 0) {
    return json({ error: "Room is not billable" }, { status: 400 });
  }

  const durationHours = (endM - startM) / 60;
  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    return json({ error: "Invalid duration" }, { status: 400 });
  }

  const total = durationHours * pricePerHour;
  // Stripe expects integer minor units
  const amountCents = Math.round(total * 100);
  if (amountCents < 50) return json({ error: "Amount too small" }, { status: 400 });

  let booking: { id: string } | null = bookingId ? { id: bookingId } : null;

  if (!bookingId) {
    // Prevent overlaps (server-side) for new bookings
    const { data: existing, error: existingErr } = await supabase
      .from("bookings")
      .select("id,start_time,end_time,status")
      .eq("room_id", roomId)
      .eq("booking_date", bookingDate);

    if (existingErr) {
      return json({ error: existingErr.message || "Failed to check availability" }, { status: 400 });
    }

    for (const b of existing || []) {
      if (b.status === "rejected") continue;
      const s = parseTimeToMinutes(String(b.start_time || ""));
      const e = parseTimeToMinutes(String(b.end_time || ""));
      if (overlaps(startM, endM, s, e)) {
        return json({ error: "This time slot overlaps with an existing booking." }, { status: 409 });
      }
    }

    // Insert booking first (so cancel URL can reference it)
    const bookingPayload = {
      room_id: roomId,
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      user_id: user.id,
      user_email: user.email ?? null,
      user_full_name: fullName,
      user_phone: phone,
      total_price: total,
      price_per_hour: pricePerHour,
      billable_hours: durationHours,
      status: "payment_pending",
    };

    const { data: created, error: bookingErr } = await supabase
      .from("bookings")
      .insert(bookingPayload)
      .select("id")
      .single();

    if (bookingErr) {
      return json({ error: bookingErr.message || "Failed to create booking" }, { status: 400 });
    }

    booking = created;
  }

  const origin = getOrigin(req);
  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    client_reference_id: booking?.id,
    success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/payment/cancel?booking_id=${encodeURIComponent(booking?.id || "")}`,
    customer_email: user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `Daybnb booking: ${room.title || "Room"}`,
            metadata: { room_id: roomId },
          },
        },
      },
    ],
    metadata: {
      booking_id: booking?.id,
      room_id: roomId,
      user_id: user.id,
    },
  });

  if (!session?.url) {
    return json({ error: "Failed to create Stripe Checkout Session" }, { status: 500 });
  }

  return json(
    { url: session.url, bookingId: booking?.id },
    { headers: { "access-control-allow-origin": "*" } }
  );
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      bookingId,
      roomTitle,
      roomId,
      totalPrice,
      durationHours,
      pricePerHour,
      bookingDate,
      startTime,
      endTime,
      userEmail,
      userId,
    } = await req.json();

    // Validate required fields
    if (!bookingId || !totalPrice || !roomTitle) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the origin for redirect URLs
    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: userEmail,
      client_reference_id: bookingId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: roomTitle,
              description: `Booking for ${bookingDate} from ${startTime} to ${endTime} (${durationHours} hours)`,
            },
            unit_amount: Math.round(totalPrice * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: bookingId,
        room_id: roomId,
        user_id: userId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        duration_hours: String(durationHours),
        price_per_hour: String(pricePerHour),
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${origin}/payment-cancel?booking_id=${bookingId}`,
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create checkout session" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
