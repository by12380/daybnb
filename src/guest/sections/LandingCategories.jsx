import React from "react";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";

const CATEGORIES = [
  { title: "Work-ready homes", tag: "Quiet + Wi-Fi" },
  { title: "Pool day passes", tag: "Outdoor escape" },
  { title: "Creative studios", tag: "Photo + video" },
  { title: "Family day stays", tag: "Kid friendly" },
];

const LandingCategories = React.memo(() => (
  <div>
    <h2 className="text-2xl font-semibold text-gradient-brand">Popular categories</h2>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {CATEGORIES.map((category) => (
        <Card
          key={category.title}
          className="flex items-center justify-between transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10"
        >
          <div>
            <p className="text-lg font-semibold text-ink">{category.title}</p>
            <p className="text-sm text-muted">{category.tag}</p>
          </div>
          <Badge tone="neutral">Explore</Badge>
        </Card>
      ))}
    </div>
  </div>
));

export default LandingCategories;
