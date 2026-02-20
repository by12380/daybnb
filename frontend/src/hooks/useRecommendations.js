import { useEffect, useState } from "react";
import { searchClient, indexName, isAlgoliaConfigured } from "../lib/algoliaClient.js";

const MAX_RECOMMENDATIONS = 6;
const RETRIEVE_FIELDS = [
  "objectID", "title", "location", "image", "price_per_day", "guests",
  "type", "tags", "amenities", "bedrooms", "beds", "bathrooms",
  "instant_book", "allows_pets", "self_checkin", "is_guest_favorite",
  "is_luxe", "property_type", "place_type",
];

function q(value) {
  return `"${String(value).replace(/"/g, "")}"`;
}

function excludeFilter(roomId) {
  return `NOT objectID:${q(roomId)}`;
}

function baseParams(roomId) {
  return {
    hitsPerPage: MAX_RECOMMENDATIONS,
    filters: excludeFilter(roomId),
    attributesToRetrieve: RETRIEVE_FIELDS,
  };
}

function buildQueries(roomId, room) {
  const hasGeo = room.latitude != null && room.longitude != null;
  const latLng = hasGeo ? `${room.latitude}, ${room.longitude}` : undefined;
  const exclude = excludeFilter(roomId);
  const queries = [];

  // Tier 1 — nearby + same type (50 km)
  if (hasGeo && room.type) {
    queries.push({
      indexName,
      params: {
        ...baseParams(roomId),
        aroundLatLng: latLng,
        aroundRadius: 50000,
        filters: `${exclude} AND type:${q(room.type)}`,
      },
    });
  }

  // Tier 2 — nearby any type (200 km)
  if (hasGeo) {
    queries.push({
      indexName,
      params: {
        ...baseParams(roomId),
        aroundLatLng: latLng,
        aroundRadius: 200000,
      },
    });
  }

  // Tier 3 — same type or property_type anywhere
  if (room.type || room.property_type) {
    const parts = [];
    if (room.type) parts.push(`type:${q(room.type)}`);
    if (room.property_type) parts.push(`property_type:${q(room.property_type)}`);

    queries.push({
      indexName,
      params: {
        ...baseParams(roomId),
        filters: `${exclude} AND (${parts.join(" OR ")})`,
      },
    });
  }

  // Tier 4 — location text search
  if (room.location) {
    queries.push({
      indexName,
      params: {
        ...baseParams(roomId),
        query: room.location,
      },
    });
  }

  // Tier 5 — standout stays (guest favorites / luxe)
  queries.push({
    indexName,
    params: {
      ...baseParams(roomId),
      filters: `${exclude} AND (is_guest_favorite:true OR is_luxe:true)`,
    },
  });

  // Tier 6 — catch-all: any other rooms (guarantees results if index has data)
  queries.push({
    indexName,
    params: baseParams(roomId),
  });

  return queries;
}

function mergeHits(results, max) {
  const seen = new Set();
  const merged = [];

  for (const result of results) {
    const hits = result?.hits || [];
    for (const hit of hits) {
      if (seen.has(hit.objectID)) continue;
      seen.add(hit.objectID);
      merged.push(hit);
      if (merged.length >= max) return merged;
    }
  }

  return merged;
}

export function useRecommendations(roomId, room) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!roomId || !room || !isAlgoliaConfigured) return;

    let cancelled = false;
    setLoading(true);

    const queries = buildQueries(roomId, room);

    searchClient
      .search(queries)
      .then((res) => {
        if (!cancelled) {
          setRecommendations(mergeHits(res.results || [], MAX_RECOMMENDATIONS));
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch recommendations:", err);
        if (!cancelled) setRecommendations([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [roomId, room?.latitude, room?.longitude, room?.location, room?.type, room?.property_type]);

  return { recommendations, loading };
}
