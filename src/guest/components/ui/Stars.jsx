import React, { useCallback, useMemo } from "react";

function clampRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, n));
}

function StarIcon({ filled, className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeWidth="1.5"
        d="M10 1.6l2.53 5.26 5.8.84-4.2 4.1.99 5.78L10 14.9l-5.12 2.68.99-5.78-4.2-4.1 5.8-.84L10 1.6z"
      />
    </svg>
  );
}

export const StarsDisplay = React.memo(function StarsDisplay({
  value = 0,
  count = null,
  className = "",
}) {
  const v = clampRating(value);
  const full = Math.round(v);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-0.5 text-amber-500">
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon key={i} filled={i < full} className="h-4 w-4" />
        ))}
      </div>
      <div className="text-xs text-muted dark:text-dark-muted">
        <span className="font-medium text-ink dark:text-dark-ink">{v ? v.toFixed(1) : "0.0"}</span>
        {typeof count === "number" ? <span className="ml-1">({count})</span> : null}
      </div>
    </div>
  );
});

export const StarsInput = React.memo(function StarsInput({
  value,
  onChange,
  disabled = false,
  className = "",
  size = "md",
}) {
  const v = clampRating(value);
  const starClass = useMemo(() => {
    const base = "transition";
    if (size === "lg") return `${base} h-7 w-7`;
    if (size === "sm") return `${base} h-4 w-4`;
    return `${base} h-5 w-5`;
  }, [size]);

  const handleSet = useCallback(
    (n) => {
      if (disabled) return;
      onChange?.(n);
    },
    [disabled, onChange]
  );

  return (
    <div className={`flex items-center gap-1 ${className}`} role="radiogroup" aria-label="Rating">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const filled = n <= v;
        return (
          <button
            key={n}
            type="button"
            onClick={() => handleSet(n)}
            disabled={disabled}
            className={`rounded-md p-1 ${
              disabled ? "cursor-not-allowed opacity-60" : "hover:bg-amber-50 dark:hover:bg-amber-900/30"
            }`}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            aria-checked={n === v}
            role="radio"
          >
            <StarIcon
              filled={filled}
              className={`${starClass} ${filled ? "text-amber-500" : "text-slate-300 dark:text-slate-600"}`}
            />
          </button>
        );
      })}
    </div>
  );
});

