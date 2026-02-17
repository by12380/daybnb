import React from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";

const CATEGORY_KEYS = [
  { title: "categories.workReady", tag: "categories.workReadyTag" },
  { title: "categories.poolDay", tag: "categories.poolDayTag" },
  { title: "categories.creativeStudios", tag: "categories.creativeStudiosTag" },
  { title: "categories.familyDay", tag: "categories.familyDayTag" },
];

const LandingCategories = React.memo(() => {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-2xl font-semibold text-brand-700">{t("categories.title")}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {CATEGORY_KEYS.map((category) => (
          <Card
            key={category.title}
            className="flex items-center justify-between transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10"
          >
            <div>
              <p className="text-lg font-semibold text-ink">{t(category.title)}</p>
              <p className="text-sm text-muted">{t(category.tag)}</p>
            </div>
            <Badge tone="neutral">{t("common.explore")}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
});

export default LandingCategories;
