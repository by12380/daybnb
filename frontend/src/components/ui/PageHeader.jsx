import React from "react";

export default function PageHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}>
      <div>
        <h1 className="text-2xl font-bold text-ink dark:text-dark-ink">{title}</h1>
        {subtitle ? (
          <div className="mt-1 text-sm text-muted dark:text-dark-muted">
            {subtitle}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
