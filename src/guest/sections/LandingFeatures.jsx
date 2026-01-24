import React from "react";
import Card from "../components/ui/Card.jsx";

const FEATURES = [
  {
    title: "Hourly or full-day booking",
    description:
      "Reserve exactly the hours you need or lock the full daytime window.",
  },
  {
    title: "Daytime-only guarantee",
    description:
      "Every listing follows the platform-wide daytime hours policy.",
  },
  {
    title: "Arrival and end-time reminders",
    description:
      "Automatic reminders help guests arrive on time and wrap up smoothly.",
  },
  {
    title: "Transparent pricing",
    description:
      "See hourly rates, day rates, fees, and taxes before you confirm.",
  },
];

const LandingFeatures = React.memo(() => (
  <div>
    <h2 className="text-2xl font-semibold text-gradient-brand">Why guests love Daybnb</h2>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {FEATURES.map((feature) => (
        <Card key={feature.title}>
          <h3 className="text-lg font-semibold text-ink">{feature.title}</h3>
          <p className="mt-2 text-sm text-muted">{feature.description}</p>
        </Card>
      ))}
    </div>
  </div>
));

export default LandingFeatures;
