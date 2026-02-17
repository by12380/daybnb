import React from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card.jsx";

const FEATURE_KEYS = [
  { title: "features.hourlyBooking", desc: "features.hourlyBookingDesc" },
  { title: "features.daytimeGuarantee", desc: "features.daytimeGuaranteeDesc" },
  { title: "features.reminders", desc: "features.remindersDesc" },
  { title: "features.pricing", desc: "features.pricingDesc" },
];

const LandingFeatures = React.memo(() => {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-2xl font-semibold text-brand-700 dark:text-brand-400">
        {t("features.title")}
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {FEATURE_KEYS.map((feature) => (
          <Card key={feature.title}>
            <h3 className="text-lg font-semibold text-ink dark:text-dark-ink">{t(feature.title)}</h3>
            <p className="mt-2 text-sm text-muted dark:text-dark-muted">{t(feature.desc)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
});

export default LandingFeatures;
