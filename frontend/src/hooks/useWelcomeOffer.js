import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth.js";
import { supabase } from "../lib/supabaseClient.js";

// Welcome offer configuration
export const WELCOME_DISCOUNT_PERCENT = 10;
export const WELCOME_OFFER_BOOKINGS_LIMIT = 1; // Offer valid until first booking is created

/**
 * Hook to manage welcome offer for new users
 * New users get a 10% discount on their first booking
 */
export function useWelcomeOffer() {
  const { user, loading: authLoading } = useAuth();
  const [isEligible, setIsEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [hasUsedOffer, setHasUsedOffer] = useState(false);

  const checkEligibility = useCallback(async () => {
    if (!user?.id || !supabase) {
      setIsEligible(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Check how many total bookings the user has
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id")
        .eq("user_id", user.id)
        .limit(WELCOME_OFFER_BOOKINGS_LIMIT);

      if (error) {
        console.error("Error checking welcome offer eligibility:", error);
        // If error, assume new user is eligible (fail-open for better UX)
        setIsEligible(true);
        setLoading(false);
        return;
      }

      const totalCount = (bookings || []).length;
      setBookingsCount(totalCount);

      // User is eligible if they have no bookings at all
      // New users with 0 bookings get the 10% discount
      const eligible = totalCount < WELCOME_OFFER_BOOKINGS_LIMIT;
      setIsEligible(eligible);
      setHasUsedOffer(!eligible);
    } catch (err) {
      console.error("Error in welcome offer check:", err);
      setIsEligible(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) {
      checkEligibility();
    }
  }, [authLoading, checkEligibility]);

  /**
   * Calculate the discounted price
   */
  const calculateDiscountedPrice = useCallback((originalPrice) => {
    if (!isEligible || !Number.isFinite(originalPrice) || originalPrice <= 0) {
      return {
        originalPrice,
        discountedPrice: originalPrice,
        discountAmount: 0,
        discountPercent: 0,
        hasDiscount: false,
      };
    }

    const discountAmount = (originalPrice * WELCOME_DISCOUNT_PERCENT) / 100;
    const discountedPrice = originalPrice - discountAmount;

    return {
      originalPrice,
      discountedPrice: Math.round(discountedPrice * 100) / 100, // Round to 2 decimal places
      discountAmount: Math.round(discountAmount * 100) / 100,
      discountPercent: WELCOME_DISCOUNT_PERCENT,
      hasDiscount: true,
    };
  }, [isEligible]);

  return {
    isEligible,
    loading: authLoading || loading,
    bookingsCount,
    hasUsedOffer,
    discountPercent: WELCOME_DISCOUNT_PERCENT,
    calculateDiscountedPrice,
    refetch: checkEligibility,
  };
}

/**
 * Format welcome offer message
 */
export function getWelcomeOfferMessage(isEligible, discountPercent = WELCOME_DISCOUNT_PERCENT) {
  if (!isEligible) return null;
  return `Welcome! Enjoy ${discountPercent}% off your first booking.`;
}
