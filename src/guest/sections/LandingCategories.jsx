import React, { useMemo } from "react";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";

const LandingCategories = React.memo(() => {
  const categories = useMemo(
    () => [
      { title: "Work-ready homes", tag: "Quiet + Wi-Fi" },
      { title: "Pool day passes", tag: "Outdoor escape" },
      { title: "Creative studios", tag: "Photo + video" },
      { title: "Family day stays", tag: "Kid friendly" },
    ],
    []
  );

  return (
    <div>
      <h2 className="text-2xl font-semibold text-brand-700">Popular categories</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {categories.map((category) => (
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
  );
});

export default LandingCategories;
