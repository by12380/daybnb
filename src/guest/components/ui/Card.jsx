import React from "react";

const Card = React.memo(({ children, className = "" }) => (
  <div
    className={`rounded-3xl border border-border bg-white p-6 shadow-xl shadow-slate-200/60 ${className}`}
  >
    {children}
  </div>
));

export default Card;
