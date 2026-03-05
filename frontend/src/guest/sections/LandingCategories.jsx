import React from "react";
import { useTranslation } from "react-i18next";

const CATEGORY_ITEMS = [
  {
    id: "workReady",
    titleKey: "categories.workReady",
    tagKey: "categories.workReadyTag",
    iconTone: "from-brand-500 to-brand-600",
    glowTone: "from-brand-500/25 via-brand-400/10 to-transparent",
  },
  {
    id: "poolDay",
    titleKey: "categories.poolDay",
    tagKey: "categories.poolDayTag",
    iconTone: "from-cyan-500 to-sky-500",
    glowTone: "from-cyan-500/25 via-sky-400/10 to-transparent",
  },
  {
    id: "creativeStudios",
    titleKey: "categories.creativeStudios",
    tagKey: "categories.creativeStudiosTag",
    iconTone: "from-violet-500 to-fuchsia-500",
    glowTone: "from-violet-500/25 via-fuchsia-400/10 to-transparent",
  },
  {
    id: "familyDay",
    titleKey: "categories.familyDay",
    tagKey: "categories.familyDayTag",
    iconTone: "from-amber-500 to-orange-500",
    glowTone: "from-amber-500/25 via-orange-400/10 to-transparent",
  },
];

const CategoryIcon = ({ categoryId }) => {
  if (categoryId === "poolDay") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M4 14c1.3 1.3 2.7 2 4 2s2.7-.7 4-2c1.3 1.3 2.7 2 4 2s2.7-.7 4-2" />
        <path d="M6 11l2-4h8l2 4" />
      </svg>
    );
  }

  if (categoryId === "creativeStudios") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <circle cx="9" cy="11" r="1.5" />
        <path d="M20 15l-4-4-4 4-2-2-4 4" />
      </svg>
    );
  }

  if (categoryId === "familyDay") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M5 11l7-6 7 6" />
        <path d="M7 10v8h10v-8" />
        <path d="M10 18v-4h4v4" />
      </svg>
    );
  }

  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
};

const LandingCategories = React.memo(() => {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-panel px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/15" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-accent-500/10 blur-3xl dark:bg-accent-500/20" />

      <div className="relative">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold text-brand-700 dark:text-brand-400 sm:text-3xl">
            {t("categories.title")}
          </h2>
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-brand-200 bg-brand-50 px-2 text-xs font-semibold text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {CATEGORY_ITEMS.length}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CATEGORY_ITEMS.map((category) => (
            <article
              key={category.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-white/90 p-5 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-500/10 dark:border-white/10 dark:bg-dark-panel/90 dark:shadow-black/25 dark:hover:border-brand-700/70"
            >
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${category.glowTone}`}
              />

              <div
                className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg shadow-brand-500/20 ${category.iconTone}`}
              >
                <CategoryIcon categoryId={category.id} />
              </div>

              <h3 className="relative mt-4 text-lg font-semibold text-ink dark:text-dark-ink">
                {t(category.titleKey)}
              </h3>
              <p className="relative mt-1 text-sm text-muted dark:text-dark-muted">{t(category.tagKey)}</p>

              <div className="relative mt-5 flex items-center justify-between">
                <span className="inline-flex items-center rounded-full border border-border bg-panel px-3 py-1 text-xs font-medium text-muted dark:border-white/10 dark:bg-dark-surface dark:text-dark-muted">
                  {t("common.explore")}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-ink transition-all duration-300 group-hover:border-brand-300 group-hover:text-brand-600 dark:border-white/10 dark:bg-dark-surface dark:text-dark-ink dark:group-hover:border-brand-600 dark:group-hover:text-brand-300">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M5 12h14" />
                    <path d="M13 6l6 6-6 6" />
                  </svg>
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
});

export default LandingCategories;
