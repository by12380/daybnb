import React from "react";

export const INPUT_STYLES =
  "rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm placeholder:text-muted/70 focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-dark-border dark:bg-dark-panel dark:text-dark-ink dark:placeholder:text-dark-muted/70 dark:focus:border-brand-500/70 dark:focus:ring-brand-700";

const FormInput = React.memo(({ label, className = "", ...props }) => (
  <label className={`flex flex-col gap-2 ${className}`}>
    <span className="text-sm font-medium text-muted dark:text-dark-muted">{label}</span>
    <input className={INPUT_STYLES} {...props} />
  </label>
));

export default FormInput;
