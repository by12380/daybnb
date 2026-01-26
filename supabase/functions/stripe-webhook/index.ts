// Supabase Edge Function: stripe-webhook
//
// Production recommendation:
// - Use Stripe webhooks to reliably mark bookings paid, even if the user closes the browser
//
// Required secrets:
// - STRIPE_SECRET_KEY
// - STRIPE_WEBHOOK_SECRET
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
//
// Events handled:
// - checkout.session.completed -> if paid, set booking.status = "pending"

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
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }
  if (!stripeSecretKey || !webhookSecret) {
    return json({ error: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });
  const signature = req.headers.get("stripe-signature") || "";
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (_e) {
    return json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const bookingId = session.client_reference_id || (session.metadata?.booking_id as string) || "";
  if (!bookingId) return json({ received: true, warning: "missing booking id" });

  // Only act if Stripe says it's paid
  if (session.payment_status !== "paid") return json({ received: true, bookingId, paid: false });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { error: updateErr } = await supabase
    .from("bookings")
    .update({ status: "pending" })
    .eq("id", bookingId);

  if (updateErr) return json({ error: updateErr.message || "Failed to update booking" }, { status: 400 });

  return json({ received: true, bookingId, paid: true });
});

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
