import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") as string;

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      endpointSecret
    );

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};
        const existingBookingId = meta.booking_id;

        if (existingBookingId) {
          // Legacy flow: booking was created before checkout – just mark as paid
          const { data: existing } = await supabase
            .from("bookings")
            .select("id, payment_status")
            .eq("id", existingBookingId)
            .maybeSingle();

          if (existing && existing.payment_status !== "paid") {
            const { error } = await supabase
              .from("bookings")
              .update({
                payment_status: "paid",
                stripe_session_id: session.id,
                stripe_payment_intent_id: session.payment_intent as string,
                paid_at: new Date().toISOString(),
              })
              .eq("id", existingBookingId);

            if (error) {
              console.error("Error updating booking:", error);
              return new Response(JSON.stringify({ error: error.message }), { status: 500 });
            }
            console.log(`Booking ${existingBookingId} marked as paid`);
          }
        } else if (meta.room_id && meta.user_id && meta.booking_date) {
          // New flow: create booking from Stripe metadata after payment
          const { data: alreadyCreated } = await supabase
            .from("bookings")
            .select("id")
            .eq("stripe_session_id", session.id)
            .maybeSingle();

          if (!alreadyCreated) {
            const totalPrice = meta.total_price ? Number(meta.total_price) : null;
            const pricePerDay = meta.price_per_day ? Number(meta.price_per_day) : null;
            const discountAmount = meta.discount_amount ? Number(meta.discount_amount) : 0;
            const originalPrice = meta.original_price ? Number(meta.original_price) : null;

            const payload: Record<string, unknown> = {
              room_id: meta.room_id,
              booking_date: meta.booking_date,
              user_id: meta.user_id,
              user_email: meta.user_email || null,
              user_full_name: meta.user_full_name || null,
              user_phone: meta.user_phone || null,
              total_price: totalPrice,
              price_per_day: pricePerDay,
              status: "pending",
              payment_method: "online",
              payment_status: "paid",
              stripe_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent as string,
              paid_at: new Date().toISOString(),
            };

            if (discountAmount > 0) {
              payload.original_price = originalPrice;
              payload.discount_amount = discountAmount;
              payload.discount_applied = meta.discount_applied || null;
            }

            let insertResult = await supabase.from("bookings").insert(payload).select().single();

            if (
              insertResult.error &&
              /discount_amount|discount_applied|original_price/i.test(
                String(insertResult.error.message || "")
              )
            ) {
              const fallback = { ...payload };
              delete fallback.original_price;
              delete fallback.discount_amount;
              delete fallback.discount_applied;
              insertResult = await supabase.from("bookings").insert(fallback).select().single();
            }

            if (insertResult.error) {
              console.error("Failed to create booking from Stripe session:", insertResult.error);
            } else {
              console.log(`Booking ${insertResult.data.id} created after payment (session ${session.id})`);
            }
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;

        if (bookingId) {
          await supabase
            .from("bookings")
            .update({ payment_status: "expired" })
            .eq("id", bookingId);

          console.log(`Booking ${bookingId} payment expired`);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed for intent: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Webhook handler failed" }),
      { status: 400 }
    );
  }
});
