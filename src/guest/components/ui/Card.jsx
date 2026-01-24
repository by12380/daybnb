import React from "react";

const Card = React.memo(({ children, className = "" }) => (
  <div
    className={`rounded-3xl border border-border bg-white p-6 shadow-xl shadow-slate-200/60 transition-colors duration-300 dark:border-dark-border dark:bg-dark-panel dark:shadow-dark-navy/60 ${className}`}
  >
    {children}
  </div>
));

export default Card;
