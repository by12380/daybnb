import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "./supabaseClient.js";

// Initialize Stripe with your publishable key
// Set VITE_STRIPE_PUBLISHABLE_KEY in your .env file
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

let stripePromise = null;

export const getStripe = () => {
  if (!stripePromise && stripePublishableKey) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// Helper to create checkout session via Supabase Edge Function
export async function createCheckoutSession({
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
}) {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  // Use Supabase's invoke method - handles auth automatically
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: {
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
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to create checkout session");
  }

  return data;
}

// Redirect to Stripe Checkout
export async function redirectToCheckout(sessionId) {
  const stripe = await getStripe();
  
  if (!stripe) {
    throw new Error("Stripe not initialized. Check your publishable key.");
  }

  const { error } = await stripe.redirectToCheckout({ sessionId });
  
  if (error) {
    throw error;
  }
}
