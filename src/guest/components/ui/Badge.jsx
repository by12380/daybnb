import React from "react";

const TONES = {
  brand:
    "border border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-400/30 dark:bg-brand-500/10 dark:text-brand-200",
  accent:
    "border border-accent-500/40 bg-accent-100 text-accent-500 dark:bg-accent-500/10 dark:text-accent-300",
  neutral: "border border-border bg-panel text-muted",
};

const Badge = React.memo(({ children, tone = "brand" }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-medium ${TONES[tone]}`}>
    {children}
  </span>
));

export default Badge;
