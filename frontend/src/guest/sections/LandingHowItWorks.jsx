import React from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card.jsx";

const STEP_KEYS = [
  { title: "howItWorks.searchByTime", desc: "howItWorks.searchByTimeDesc" },
  { title: "howItWorks.confirmInstantly", desc: "howItWorks.confirmInstantlyDesc" },
  { title: "howItWorks.enjoyYourDay", desc: "howItWorks.enjoyYourDayDesc" },
];

const LandingHowItWorks = React.memo(() => {
  const { t } = useTranslation();

  return (
    <div id="how-it-works">
      <h2 className="text-2xl font-semibold text-brand-700 dark:text-brand-400">{t("howItWorks.title")}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {STEP_KEYS.map((step, index) => (
          <Card
            key={step.title}
            className="transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:hover:shadow-brand-500/5"
          >
            <p className="text-sm font-semibold text-gradient dark:text-gradient-dark">
              {t("howItWorks.step", { number: index + 1 })}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-ink dark:text-dark-ink">{t(step.title)}</h3>
            <p className="mt-2 text-sm text-muted dark:text-dark-muted">{t(step.desc)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
});

export default LandingHowItWorks;
