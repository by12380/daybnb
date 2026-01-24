import React from "react";

const TONES = {
  brand: "border border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300",
  accent: "border border-accent-500/40 bg-accent-100 text-accent-500 dark:border-accent-500/30 dark:bg-accent-500/20 dark:text-accent-500",
  neutral: "border border-border bg-white text-muted dark:border-dark-border dark:bg-dark-panel dark:text-dark-muted",
};

const Badge = React.memo(({ children, tone = "brand" }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-300 ${TONES[tone]}`}>
    {children}
  </span>
));

export default Badge;
