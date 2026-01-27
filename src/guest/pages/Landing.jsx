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
import { useProfile } from "../../auth/useProfile.js";

const Landing = React.memo(() => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useProfile();
  const [searchParams, setSearchParams] = useState({
    query: "",
    location: "",
    date: "",
    guests: 0,
    minPrice: "",
    maxPrice: "",
    startTime: "08:00",
    endTime: "17:00",
    lat: null,
    lng: null,
    bookingType: "hourly",
  });

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (!loading && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [loading, isAdmin, navigate]);

  const onSearch = useCallback((params) => {
    setSearchParams((prev) => ({
      ...prev,
      ...(params || {}),
      query: params?.query || "",
      location: params?.location || "",
      date: params?.date || "",
      guests: Number(params?.guests) || 0,
    }));
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
      <section id="hero" className="py-8">
        <LandingHero />
      </section>
      <section id="search" className="py-8">
        <LandingSearch onSearch={onSearch} />
      </section>
      <section id="gallery" className="py-8">
        <LandingGallery searchParams={searchParams} />
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
