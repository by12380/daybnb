import React from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card.jsx";

const TESTIMONIAL_KEYS = [
  { quote: "testimonials.quote1", name: "testimonials.name1" },
  { quote: "testimonials.quote2", name: "testimonials.name2" },
];

const LandingTestimonials = React.memo(() => {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-2xl font-semibold text-brand-700 dark:text-brand-400">{t("testimonials.title")}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {TESTIMONIAL_KEYS.map((item) => (
          <Card
            key={item.quote}
            className="transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:hover:shadow-brand-500/5"
          >
            <p className="text-sm text-muted dark:text-dark-muted">"{t(item.quote)}"</p>
            <p className="mt-3 text-sm font-semibold text-ink dark:text-dark-ink">{t(item.name)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
});

export default LandingTestimonials;
