import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LandingHero from "../sections/LandingHero.jsx";
import LandingFeatures from "../sections/LandingFeatures.jsx";
import LandingCategories from "../sections/LandingCategories.jsx";
import LandingHowItWorks from "../sections/LandingHowItWorks.jsx";
import LandingTestimonials from "../sections/LandingTestimonials.jsx";
import LandingCTA from "../sections/LandingCTA.jsx";
import WelcomeOfferBanner from "../components/WelcomeOfferBanner.jsx";
import CampaignBanner from "../components/CampaignBanner.jsx";
import { GeoSearch } from "../components/search/index.js";
import { useProfile } from "../../auth/useProfile.js";

const Landing = React.memo(() => {
  const navigate = useNavigate();
  const { isAdmin, isOwner, loading } = useProfile();

  useEffect(() => {
    if (!loading && isAdmin) {
      navigate("/admin", { replace: true });
    } else if (!loading && isOwner) {
      navigate("/owner", { replace: true });
    }
  }, [loading, isAdmin, isOwner, navigate]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (isAdmin) return null;

  return (
    <>
      <CampaignBanner className="mb-4" />
      <WelcomeOfferBanner className="mb-4" />

      <section id="hero" className="py-8">
        <LandingHero />
      </section>

      <section id="search" className="py-8">
        <GeoSearch />
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
