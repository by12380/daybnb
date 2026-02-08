const { stripe } = require("../config/stripe");
const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/**
 * POST /api/stripe/create-checkout-session
 * Create a Stripe Checkout session for a booking.
 */
exports.createCheckoutSession = asyncHandler(async (req, res) => {
  if (!stripe) throw ApiError.internal("Stripe is not configured");

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
  } = req.body;

  if (!bookingId || !totalPrice || !roomTitle) {
    throw ApiError.badRequest("bookingId, totalPrice, and roomTitle are required");
  }

  const origin = req.headers.origin || process.env.CLIENT_URL || "http://localhost:5173";

  // Build description
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
    customer_email: userEmail || req.user?.email,
    client_reference_id: bookingId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: roomTitle,
            description,
          },
          unit_amount: Math.round(totalPrice * 100), // Stripe expects cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: bookingId,
      room_id: roomId || "",
      user_id: userId || req.user?.id || "",
      booking_date: bookingDate || "",
      start_time: startTime || "",
      end_time: endTime || "",
      duration_hours: durationHours ? String(durationHours) : "",
      price_per_hour: pricePerHour ? String(pricePerHour) : "",
      price_per_day: pricePerDay ? String(pricePerDay) : "",
      original_price: originalPrice ? String(originalPrice) : "",
      discount_amount: discountAmount ? String(discountAmount) : "",
      discount_applied: discountApplied || "",
    },
    success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
    cancel_url: `${origin}/payment-cancel?booking_id=${bookingId}`,
  });

  res.json({ sessionId: session.id, url: session.url });
});

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events.
 * NOTE: This route needs the raw body (not JSON parsed).
 */
exports.handleWebhook = async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: "Stripe is not configured" });
  }

  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    return res.status(400).json({ error: "Missing signature or webhook secret" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;

        if (bookingId && supabaseAdmin) {
          const { error } = await supabaseAdmin
            .from("bookings")
            .update({
              payment_status: "paid",
              stripe_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent,
              paid_at: new Date().toISOString(),
              status: "confirmed",
            })
            .eq("id", bookingId);

          if (error) {
            console.error("Error updating booking:", error);
            return res.status(500).json({ error: error.message });
          }

          console.log(`Booking ${bookingId} marked as paid`);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;

        if (bookingId && supabaseAdmin) {
          await supabaseAdmin
            .from("bookings")
            .update({ payment_status: "expired" })
            .eq("id", bookingId);

          console.log(`Booking ${bookingId} payment expired`);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        console.log(`Payment failed for intent: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
};
