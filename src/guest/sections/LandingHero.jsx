import React, { useCallback } from "react";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";

const LandingHero = React.memo(() => {
  const onStartSearch = useCallback(() => {
    const el = document.getElementById("search");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand-50 via-white to-white px-6 py-14 shadow-2xl shadow-slate-200/60">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-200/60 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent-100 blur-3xl" />
      <div className="relative">
        <Badge tone="brand">Day-Use Only</Badge>
        <h1 className="mt-4 text-4xl font-bold text-ink md:text-5xl">
          Book homes and rooms by the day — never overnight.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Reserve stylish spaces for work, relaxation, or events during daylight
          hours. Arrival and end-time reminders keep everyone on schedule.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={onStartSearch}>Start searching</Button>
          <Button variant="outline">Browse categories</Button>
        </div>
      </div>
    </div>
  );
});

export default LandingHero;
