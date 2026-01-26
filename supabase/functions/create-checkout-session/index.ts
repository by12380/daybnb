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
