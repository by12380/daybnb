import { algoliasearch } from "algoliasearch";

const {
  ALGOLIA_APP_ID,
  ALGOLIA_ADMIN_API_KEY,
  ALGOLIA_ROOMS_INDEX = "daybnb_rooms",
} = process.env;

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
  console.error("Missing ALGOLIA_APP_ID / ALGOLIA_ADMIN_API_KEY in env.");
  process.exit(1);
}

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY);

await client.setSettings({
  indexName: ALGOLIA_ROOMS_INDEX,
  indexSettings: {
    searchableAttributes: ["title", "location", "tags"],
    attributesForFaceting: ["filterOnly(type)", "searchable(location)"],
    // GeoSearch uses `_geoloc`
    customRanking: ["desc(price_per_hour)"],
  },
});

console.log(`Configured Algolia index settings: ${ALGOLIA_ROOMS_INDEX}`);

