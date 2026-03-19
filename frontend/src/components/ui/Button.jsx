import React from "react";

const VARIANTS = {
  solid:
    "bg-brand-600 text-white shadow-lg shadow-brand-500/20 hover:bg-accent-500 dark:bg-brand-500 dark:shadow-black/25 dark:hover:bg-accent-500",
  outline:
    "border border-brand-200 bg-panel text-brand-700 hover:border-accent-500 hover:text-accent-500 dark:border-brand-600 dark:text-brand-300 dark:hover:border-accent-500 dark:hover:text-accent-500",
  ghost:
    "text-muted hover:bg-surface/60 hover:text-ink dark:text-dark-muted dark:hover:text-dark-ink",
  danger:
    "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

const Button = React.memo(
  ({ variant = "solid", size = "md", className = "", disabled, children, ...props }) => {
    const base =
      "inline-flex items-center justify-center rounded-full font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-600 disabled:pointer-events-none disabled:opacity-50";

    return (
      <button
        className={`${base} ${SIZES[size] || SIZES.md} ${VARIANTS[variant] || VARIANTS.solid} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

export default Button;
