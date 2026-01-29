import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const WELCOME_DISCOUNT_PERCENT = 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundCurrency(n: number) {
  return Math.round(n * 100) / 100;
}

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string | undefined;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") as string | undefined;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string | undefined;

    // Authenticate caller (prevents users from applying discount to other users' bookings)
    const authHeader = req.headers.get("authorization") || "";
    let authedUserId: string | null = null;

    if (supabaseUrl && supabaseAnonKey && authHeader) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await supabaseAuth.auth.getUser();
      authedUserId = data?.user?.id ?? null;
    }

    // Default to client-provided values (server may override below)
    const originalTotal = roundCurrency(toNumber(totalPrice));
    let finalTotal = originalTotal;
    let discountApplied = false;

    if (supabaseUrl && supabaseServiceKey && authedUserId) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // Ensure booking belongs to the authenticated user
      const { data: bookingRow, error: bookingErr } = await supabaseAdmin
        .from("bookings")
        .select("id, user_id")
        .eq("id", bookingId)
        .maybeSingle();

      if (bookingErr) {
        console.error("Error fetching booking for ownership check:", bookingErr);
      } else if (bookingRow?.user_id && bookingRow.user_id !== authedUserId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // "New user" welcome offer: apply on first PAID booking only.
      const { count, error: countError } = await supabaseAdmin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authedUserId)
        .eq("payment_status", "paid")
        .neq("id", bookingId);

      if (!countError && (count || 0) === 0 && originalTotal > 0) {
        finalTotal = roundCurrency(originalTotal * (1 - WELCOME_DISCOUNT_PERCENT / 100));
        discountApplied = true;

        // Keep DB aligned with what we charge in Stripe
        const { error: updateErr } = await supabaseAdmin
          .from("bookings")
          .update({ total_price: finalTotal })
          .eq("id", bookingId);

        if (updateErr) {
          console.error("Error updating booking total_price for discount:", updateErr);
        }
      }
    }

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
            unit_amount: Math.round(finalTotal * 100), // Stripe expects cents
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
        original_total_price: String(originalTotal),
        welcome_discount_percent: discountApplied ? String(WELCOME_DISCOUNT_PERCENT) : "0",
        welcome_discount_applied: discountApplied ? "true" : "false",
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
