import React from "react";

const SearchField = React.memo(
  React.forwardRef(
    ({ value, onChange, placeholder = "Search...", className = "", ...props }, ref) => (
      <div className={`relative ${className}`}>
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted dark:text-dark-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-panel py-2 pl-10 pr-3 text-sm text-ink shadow-sm placeholder:text-muted/70 focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-surface/60 disabled:text-muted dark:border-dark-border dark:bg-dark-panel dark:text-dark-ink dark:placeholder:text-dark-muted/70 dark:focus:border-brand-500 dark:focus:ring-brand-800"
          {...props}
        />
      </div>
    )
  )
);

export default SearchField;
