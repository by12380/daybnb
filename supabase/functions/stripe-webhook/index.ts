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
        
        const bookingId = session.metadata?.booking_id;
        
        if (bookingId) {
          // Update booking with payment information
          const { error } = await supabase
            .from("bookings")
            .update({
              payment_status: "paid",
              stripe_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent,
              paid_at: new Date().toISOString(),
              status: "confirmed", // Auto-confirm paid bookings
            })
            .eq("id", bookingId);

          if (error) {
            console.error("Error updating booking:", error);
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
            });
          }

          console.log(`Booking ${bookingId} marked as paid`);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;

        if (bookingId) {
          // Mark payment as expired
          await supabase
            .from("bookings")
            .update({
              payment_status: "expired",
            })
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
