import React, { forwardRef } from "react";
import { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";

const TONE_STYLES = {
  brand: "focus:border-brand-400/70 focus:ring-brand-200",
  emerald: "focus:border-emerald-400/70 focus:ring-emerald-200",
  neutral: "",
};

function SearchIcon({ className = "" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ClearIcon({ className = "" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const SearchField = forwardRef(function SearchField(
  {
    label,
    value,
    onChange,
    onClear,
    placeholder = "Search...",
    className = "",
    inputClassName = "",
    labelClassName = "",
    tone = "brand",
    ...props
  },
  ref
) {
  const Wrapper = label ? "label" : "div";
  const hasValue = String(value ?? "").length > 0;
  const toneClasses = TONE_STYLES[tone] || TONE_STYLES.brand;

  return (
    <Wrapper className={`${label ? "flex flex-col gap-2" : ""} ${className}`.trim()}>
      {label ? <span className={`text-sm font-medium text-muted ${labelClassName}`.trim()}>{label}</span> : null}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <SearchIcon className="h-4 w-4 text-muted" />
        </div>
        <input
          {...props}
          ref={ref}
          type={props.type || "search"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${INPUT_STYLES} ${toneClasses} w-full pl-10 ${hasValue && onClear ? "pr-10" : ""} ${inputClassName}`.trim()}
        />
        {hasValue && onClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted transition hover:text-ink"
          >
            <ClearIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </Wrapper>
  );
});

SearchField.displayName = "SearchField";

export default React.memo(SearchField);
