import React from "react";
import Card from "../components/ui/Card.jsx";

const TESTIMONIALS = [
  {
    quote: "Booked a quiet home office for the day. Smooth check-in!",
    name: "Jordan, Austin",
  },
  {
    quote: "Loved the pool day pass. Clear timing and easy checkout.",
    name: "Maya, Miami",
  },
];

const LandingTestimonials = React.memo(() => (
  <div>
    <h2 className="text-2xl font-semibold text-brand-700 dark:text-brand-400">Guest love</h2>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {TESTIMONIALS.map((item) => (
        <Card
          key={item.name}
          className="transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:hover:shadow-brand-500/5"
        >
          <p className="text-sm text-muted dark:text-dark-muted">"{item.quote}"</p>
          <p className="mt-3 text-sm font-semibold text-ink dark:text-dark-ink">{item.name}</p>
        </Card>
      ))}
    </div>
  </div>
));

export default LandingTestimonials;
