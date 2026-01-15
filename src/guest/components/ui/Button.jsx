import React from "react";

const Button = React.memo(
  ({ variant = "solid", className = "", ...props }) => {
    const base =
      "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-300";
    const styles =
      variant === "outline"
        ? "border border-brand-200 bg-white text-brand-700 hover:border-accent-500 hover:text-accent-500"
        : "bg-brand-600 text-white shadow-lg shadow-brand-500/20 hover:bg-accent-500";

    return <button className={`${base} ${styles} ${className}`} {...props} />;
  }
);

export default Button;
