import React from "react";

const Card = React.memo(({ children, className = "" }) => (
  <div
    className={`rounded-3xl border border-border bg-panel p-6 shadow-xl shadow-slate-200/60 dark:shadow-black/30 ${className}`}
  >
    {children}
  </div>
));

export default Card;
