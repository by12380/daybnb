import { liteClient as algoliasearch } from "algoliasearch/lite";

// Algolia configuration - uses environment variables
const ALGOLIA_APP_ID = import.meta.env.VITE_ALGOLIA_APP_ID || "";
const ALGOLIA_SEARCH_KEY = import.meta.env.VITE_ALGOLIA_SEARCH_KEY || "";
const ALGOLIA_INDEX_NAME = import.meta.env.VITE_ALGOLIA_INDEX_NAME || "daybnb_places";

// Create the Algolia search client (read-only, safe for frontend)
export const searchClient =
  ALGOLIA_APP_ID && ALGOLIA_SEARCH_KEY
    ? algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY)
    : null;

export const indexName = ALGOLIA_INDEX_NAME;

// Check if Algolia is properly configured
export const isAlgoliaConfigured = Boolean(searchClient);

// Helper to get user's current location
export async function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        let message = "Unable to get your location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location permission denied";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information unavailable";
            break;
          case error.TIMEOUT:
            message = "Location request timed out";
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache location for 5 minutes
      }
    );
  });
}

// Default search radius in meters (50km)
export const DEFAULT_SEARCH_RADIUS = 50000;

// Time constants for filtering
export const DAYTIME_HOURS = {
  start: 8, // 8 AM
  end: 17, // 5 PM
};

// Build Algolia filters for availability and price
export function buildFilters({ minPrice, maxPrice, availableDate, startHour, endHour }) {
  const filters = [];

  // Price range filter
  if (minPrice !== undefined && minPrice !== null && minPrice > 0) {
    filters.push(`price_per_hour >= ${minPrice}`);
  }
  if (maxPrice !== undefined && maxPrice !== null && maxPrice > 0) {
    filters.push(`price_per_hour <= ${maxPrice}`);
  }

  // Note: Date availability would typically be handled by:
  // 1. Storing available dates in Algolia as an array
  // 2. Or checking availability in Supabase after Algolia returns results
  // For now, we'll handle availability checking post-search via Supabase

  return filters.length > 0 ? filters.join(" AND ") : "";
}

// Convert time string (HH:MM) to hour number
export function timeToHour(timeString) {
  if (!timeString) return null;
  const [hours] = timeString.split(":").map(Number);
  return hours;
}

// Convert hour number to time string
export function hourToTime(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}
