import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LandingHero from "../sections/LandingHero.jsx";
import LandingGallery from "../sections/LandingGallery.jsx";
import LandingSearch from "../sections/LandingSearch.jsx";
import LandingFeatures from "../sections/LandingFeatures.jsx";
import LandingCategories from "../sections/LandingCategories.jsx";
import LandingHowItWorks from "../sections/LandingHowItWorks.jsx";
import LandingTestimonials from "../sections/LandingTestimonials.jsx";
import LandingCTA from "../sections/LandingCTA.jsx";
import WelcomeOfferBanner from "../components/WelcomeOfferBanner.jsx";
import CampaignBanner from "../components/CampaignBanner.jsx";
import { useProfile } from "../../auth/useProfile.js";

const Landing = React.memo(() => {
  const navigate = useNavigate();
  const { isAdmin, isOwner, loading } = useProfile();
  const [searchFilters, setSearchFilters] = useState({
    searchText: "",
    location: "",
    guests: 0,
    date: "",
    minPrice: "",
    maxPrice: "",
  });

  // Redirect admin/owner users to their respective panels
  useEffect(() => {
    if (!loading && isAdmin) {
      navigate("/admin", { replace: true });
    } else if (!loading && isOwner) {
      navigate("/owner", { replace: true });
    }
  }, [loading, isAdmin, isOwner, navigate]);

  const onSearch = useCallback((params) => {
    setSearchFilters({
      searchText: params.searchText || "",
      location: params.location || "",
      guests: Number(params.guests) || 0,
      date: params.date || "",
      minPrice: params.minPrice || "",
      maxPrice: params.maxPrice || "",
    });
  }, []);

  // Show loading while checking admin status
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  // Don't render landing page for admins (they'll be redirected)
  if (isAdmin) {
    return null;
  }

  return (
    <>
      {/* Campaign Banner — admin promotional offers */}
      <CampaignBanner className="mb-4" />

      {/* Welcome Offer Banner for new users */}
      <WelcomeOfferBanner className="mb-4" />

      <section id="hero" className="py-8">
        <LandingHero />
      </section>
      
      <section id="search" className="py-8">
        <LandingSearch onSearch={onSearch} />
      </section>
      <section id="gallery" className="py-8">
        <LandingGallery
          searchText={searchFilters.searchText}
          location={searchFilters.location}
          guests={searchFilters.guests}
        />
      </section>
      
      <section id="features" className="py-8">
        <LandingFeatures />
      </section>
      <section id="categories" className="py-8">
        <LandingCategories />
      </section>
      <section id="how" className="py-8">
        <LandingHowItWorks />
      </section>
      <section id="testimonials" className="py-8">
        <LandingTestimonials />
      </section>
      <section id="cta" className="py-8">
        <LandingCTA />
      </section>
    </>
  );
});

export default Landing;
