import React, { useCallback, useMemo, useState } from "react";
import LandingHero from "../sections/LandingHero.jsx";
import LandingGallery from "../sections/LandingGallery.jsx";
import LandingSearch from "../sections/LandingSearch.jsx";
import LandingFeatures from "../sections/LandingFeatures.jsx";
import LandingCategories from "../sections/LandingCategories.jsx";
import LandingHowItWorks from "../sections/LandingHowItWorks.jsx";
import LandingTestimonials from "../sections/LandingTestimonials.jsx";
import LandingCTA from "../sections/LandingCTA.jsx";

const Landing = React.memo(() => {
  const [searchParams, setSearchParams] = useState({
    location: "",
    date: "",
    start: "",
    end: "",
    guests: "",
    bookingType: "hourly",
  });

  const onSearch = useCallback((params) => {
    setSearchParams(params);
  }, []);

  const sections = useMemo(
    () => [
      { id: "hero", component: <LandingHero /> },
      { id: "gallery", component: <LandingGallery searchParams={searchParams} /> },
      { id: "search", component: <LandingSearch onSearch={onSearch} /> },
      { id: "features", component: <LandingFeatures /> },
      { id: "categories", component: <LandingCategories /> },
      { id: "how", component: <LandingHowItWorks /> },
      { id: "testimonials", component: <LandingTestimonials /> },
      { id: "cta", component: <LandingCTA /> },
    ],
    [onSearch, searchParams]
  );

  return (
    <>
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="py-8">
          {section.component}
        </section>
      ))}
    </>
  );
});

export default Landing;
