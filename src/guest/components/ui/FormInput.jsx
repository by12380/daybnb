import React from "react";

export const INPUT_STYLES =
  "rounded-xl border border-border bg-panel px-3 py-2 text-sm text-ink shadow-sm placeholder:text-muted/70 focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-surface/60 disabled:text-muted";

const FormInput = React.memo(({ label, className = "", ...props }) => (
  <label className={`flex flex-col gap-2 ${className}`}>
    <span className="text-sm font-medium text-muted">{label}</span>
    <input className={INPUT_STYLES} {...props} />
  </label>
));

export default FormInput;
