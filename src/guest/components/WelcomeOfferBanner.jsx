import React from "react";
import { useWelcomeOffer, WELCOME_DISCOUNT_PERCENT } from "../../hooks/useWelcomeOffer.js";
import { useAuth } from "../../auth/useAuth.js";

const WelcomeOfferBanner = React.memo(function WelcomeOfferBanner({ className = "" }) {
  const { user } = useAuth();
  const { isEligible, loading } = useWelcomeOffer();

  // Don't show if not logged in, loading, or not eligible
  if (!user || loading || !isEligible) {
    return null;
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-6 text-white shadow-lg ${className}`}>
      {/* Background decoration */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10" />
      
      <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        {/* Gift icon */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              New User Offer
            </span>
          </div>
          <h3 className="mt-2 text-2xl font-bold">
            Get {WELCOME_DISCOUNT_PERCENT}% Off Your First Booking!
          </h3>
          <p className="mt-1 text-white/90">
            Welcome to Daybnb! As a new member, enjoy an exclusive {WELCOME_DISCOUNT_PERCENT}% discount on your first room booking. 
            The discount is automatically applied at checkout.
          </p>
        </div>
        
        {/* Discount badge */}
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-white text-green-600">
          <span className="text-2xl font-bold">{WELCOME_DISCOUNT_PERCENT}%</span>
          <span className="text-xs font-semibold uppercase">Off</span>
        </div>
      </div>
    </div>
  );
});

export default WelcomeOfferBanner;
