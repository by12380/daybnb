import { liteClient as algoliasearch } from "algoliasearch/lite";

const ALGOLIA_APP_ID = import.meta.env.VITE_ALGOLIA_APP_ID;
const ALGOLIA_SEARCH_API_KEY = import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY;
const ALGOLIA_ROOMS_INDEX = import.meta.env.VITE_ALGOLIA_ROOMS_INDEX || "daybnb_rooms";

export function getAlgoliaClient() {
  if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_API_KEY) return null;
  return algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY);
}

export function getRoomsIndexName() {
  return ALGOLIA_ROOMS_INDEX;
}

export function isAlgoliaConfigured() {
  return Boolean(ALGOLIA_APP_ID && ALGOLIA_SEARCH_API_KEY && ALGOLIA_ROOMS_INDEX);
}
