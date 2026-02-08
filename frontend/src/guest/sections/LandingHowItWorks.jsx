import React from "react";
import Card from "../components/ui/Card.jsx";

const STEPS = [
  {
    title: "Search by time",
    description:
      "Pick a date, choose hourly or full-day, and stay within daytime hours.",
  },
  {
    title: "Confirm instantly",
    description:
      "See availability, pricing, and rules before you book and pay.",
  },
  {
    title: "Enjoy your day",
    description:
      "Receive arrival and end-time reminders so everyone stays on schedule.",
  },
];

const LandingHowItWorks = React.memo(() => (
  <div id="how-it-works">
    <h2 className="text-2xl font-semibold text-brand-700 dark:text-brand-400">How it works</h2>
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      {STEPS.map((step, index) => (
        <Card
          key={step.title}
          className="transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10 dark:hover:shadow-brand-500/5"
        >
          <p className="text-sm font-semibold text-gradient dark:text-gradient-dark">
            Step {index + 1}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-ink dark:text-dark-ink">{step.title}</h3>
          <p className="mt-2 text-sm text-muted dark:text-dark-muted">{step.description}</p>
        </Card>
      ))}
    </div>
  </div>
));

export default LandingHowItWorks;
