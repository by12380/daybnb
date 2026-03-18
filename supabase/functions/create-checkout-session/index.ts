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
      originalPrice,
      discountAmount,
      discountApplied,
      durationHours,
      pricePerHour,
      pricePerDay,
      bookingDate,
      startTime,
      endTime,
      userEmail,
      userId,
      userFullName,
      userPhone,
    } = await req.json();

    if (!totalPrice || !roomTitle || !roomId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: totalPrice, roomTitle, roomId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";

    let description = `Booking for ${bookingDate || "selected date"}`;
    if (startTime && endTime) {
      description += ` from ${startTime} to ${endTime}`;
    }
    if (durationHours) {
      description += ` (${durationHours} hours)`;
    }
    if (discountApplied && discountAmount > 0) {
      description += ` - ${discountApplied === "welcome_offer" ? "Welcome Offer" : discountApplied} discount applied`;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: userEmail,
      client_reference_id: bookingId || userId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: roomTitle,
              description,
            },
            unit_amount: Math.round(totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: bookingId || "",
        room_id: roomId,
        user_id: userId,
        user_email: userEmail || "",
        user_full_name: userFullName || "",
        user_phone: userPhone || "",
        booking_date: bookingDate || "",
        start_time: startTime || "",
        end_time: endTime || "",
        duration_hours: durationHours ? String(durationHours) : "",
        price_per_hour: pricePerHour ? String(pricePerHour) : "",
        price_per_day: pricePerDay ? String(pricePerDay) : "",
        total_price: String(totalPrice),
        original_price: originalPrice ? String(originalPrice) : "",
        discount_amount: discountAmount ? String(discountAmount) : "",
        discount_applied: discountApplied || "",
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-cancel`,
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
      JSON.stringify({ error: (error as Error).message || "Failed to create checkout session" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
