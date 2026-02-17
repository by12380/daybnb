import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";

const LandingHero = React.memo(() => {
  const { t } = useTranslation();

  const onStartSearch = useCallback(() => {
    const el = document.getElementById("search");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="relative overflow rounded-3xl border border-border bg-gradient-to-br from-brand-50 via-panel to-panel px-6 py-14 shadow-2xl shadow-slate-200/60 transition-colors duration-300 dark:from-brand-600/10 dark:shadow-black/30">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-200/60 blur-3xl dark:bg-brand-500/20" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent-100 blur-3xl dark:bg-accent-500/10" />
      <div className="relative">
        <Badge tone="brand">{t("hero.badge")}</Badge>
        <h1 className="mt-4 text-4xl font-bold leading-tight text-ink md:text-5xl">
          {t("hero.title")}{" "}
          <span className="text-gradient dark:text-gradient-dark">{t("hero.titleHighlight")}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          {t("hero.subtitle")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={onStartSearch}>{t("hero.cta")}</Button>
        </div>
      </div>
    </div>
  );
});

export default LandingHero;
