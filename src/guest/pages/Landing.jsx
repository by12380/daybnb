import React, { useCallback, useState } from "react";
import LandingHero from "../sections/LandingHero.jsx";
import LandingGallery from "../sections/LandingGallery.jsx";
import LandingSearch from "../sections/LandingSearch.jsx";
import LandingFeatures from "../sections/LandingFeatures.jsx";
import LandingCategories from "../sections/LandingCategories.jsx";
import LandingHowItWorks from "../sections/LandingHowItWorks.jsx";
import LandingTestimonials from "../sections/LandingTestimonials.jsx";
import LandingCTA from "../sections/LandingCTA.jsx";

const Landing = React.memo(() => {
  const [location, setLocation] = useState("");
  const [guests, setGuests] = useState(0);

  const onSearch = useCallback((params) => {
    setLocation(params.location || "");
    setGuests(Number(params.guests) || 0);
  }, []);

  return (
    <>
      <section id="hero" className="py-8">
        <LandingHero />
      </section>
      <section id="gallery" className="py-8">
        <LandingGallery location={location} guests={guests} />
      </section>
      <section id="search" className="py-8">
        <LandingSearch onSearch={onSearch} />
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
