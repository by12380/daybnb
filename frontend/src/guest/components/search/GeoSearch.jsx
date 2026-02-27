import React, { useCallback, useEffect, useState } from "react";
import { InstantSearch, Configure, useSearchBox, useInstantSearch } from "react-instantsearch";
import {
  searchClient,
  indexName,
  isAlgoliaConfigured,
  getUserLocation,
  DEFAULT_SEARCH_RADIUS,
} from "../../../lib/algoliaClient.js";
import Card from "../ui/Card.jsx";
import { INPUT_STYLES } from "../ui/FormInput.jsx";
import SearchFilters from "./SearchFilters.jsx";
import SearchResults from "./SearchResults.jsx";

// ─── Algolia not configured fallback ────────────────────────

function AlgoliaNotConfigured() {
  return (
    <Card className="py-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30">
        <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-ink dark:text-dark-ink">Search Not Configured</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted dark:text-dark-muted">
        Algolia search is not configured. Set VITE_ALGOLIA_APP_ID, VITE_ALGOLIA_SEARCH_KEY, and VITE_ALGOLIA_INDEX_NAME.
      </p>
    </Card>
  );
}

// ─── Top search bar (inside InstantSearch) ──────────────────

function TopSearchBar({ onLocationChange, userLocation, searchRadius, onRadiusChange }) {
  const { query, refine } = useSearchBox();
  const [searchText, setSearchText] = useState(query || "");
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [locError, setLocError] = useState("");

  const handleChange = useCallback((e) => {
    const v = e.target.value;
    setSearchText(v);
    refine(v);
  }, [refine]);

  const handleClear = useCallback(() => {
    setSearchText("");
    refine("");
  }, [refine]);

  const handleGetLocation = useCallback(async () => {
    setLocError("");
    setLoadingLoc(true);
    try {
      const loc = await getUserLocation();
      onLocationChange(loc);
    } catch (err) {
      setLocError(err.message);
      onLocationChange(null);
    } finally {
      setLoadingLoc(false);
    }
  }, [onLocationChange]);

  const handleClearLocation = useCallback(() => {
    onLocationChange(null);
    setLocError("");
  }, [onLocationChange]);

  const radiusOptions = [
    { value: 5000, label: "5 km" },
    { value: 10000, label: "10 km" },
    { value: 25000, label: "25 km" },
    { value: 50000, label: "50 km" },
    { value: 100000, label: "100 km" },
    { value: 200000, label: "200 km" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-panel p-3 shadow-sm dark:border-dark-border dark:bg-dark-panel sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <svg className="h-5 w-5 text-muted dark:text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="search"
            value={searchText}
            onChange={handleChange}
            placeholder="Search places, locations, room types..."
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-11 pr-9 text-sm text-ink placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink dark:placeholder:text-dark-muted dark:focus:ring-brand-800"
          />
          {searchText && (
            <button type="button" onClick={handleClear} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-ink dark:text-dark-muted">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* Location button */}
        <button
          type="button"
          onClick={userLocation ? handleClearLocation : handleGetLocation}
          disabled={loadingLoc}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            userLocation
              ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
              : "border-border bg-surface text-ink hover:border-brand-300 hover:bg-brand-50/50 dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink"
          }`}
        >
          {loadingLoc ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          )}
          {loadingLoc ? "Locating..." : userLocation ? "Near me" : "Use my location"}
        </button>

        {/* Radius selector */}
        {userLocation && (
          <select
            value={searchRadius}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className={`${INPUT_STYLES} w-auto shrink-0 py-2.5`}
          >
            {radiusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        )}
      </div>

      {/* Location status / error */}
      {userLocation && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Showing places near you
        </p>
      )}
      {locError && (
        <p className="mt-2 text-xs text-red-500">{locError}</p>
      )}
    </div>
  );
}

// ─── Algolia error banner (surfaces filter/config errors) ───

function AlgoliaErrorBanner() {
  const { error } = useInstantSearch();

  useEffect(() => {
    if (error) console.error("[Algolia error]", error);
  }, [error]);

  if (!error) return null;

  const msg = error.message || String(error);
  const isFacetError = msg.includes("attributesForFaceting") || msg.includes("not valid");

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-800 dark:bg-red-900/20">
      <p className="font-semibold text-red-700 dark:text-red-300">Algolia Search Error</p>
      <p className="mt-1 text-red-600 dark:text-red-400">{msg}</p>
      {isFacetError && (
        <p className="mt-2 text-xs text-red-500 dark:text-red-400">
          Go to <strong>Admin &rarr; Algolia Sync</strong> and click <strong>"Configure + Sync"</strong> to set up all filterable attributes.
        </p>
      )}
    </div>
  );
}

// ─── Main GeoSearch ─────────────────────────────────────────

function GeoSearch({ className = "" }) {
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(DEFAULT_SEARCH_RADIUS);
  const [selectedDate, setSelectedDate] = useState(null);

  const handleLocationChange = useCallback((loc) => setUserLocation(loc), []);
  const handleRadiusChange = useCallback((r) => setSearchRadius(r), []);
  const handleDateChange = useCallback((d) => setSelectedDate(d), []);

  if (!isAlgoliaConfigured) {
    return <AlgoliaNotConfigured />;
  }

  const aroundLatLng = userLocation ? `${userLocation.lat}, ${userLocation.lng}` : undefined;

  return (
    <div className={`space-y-6 ${className}`} id="geosearch">
      <InstantSearch searchClient={searchClient} indexName={indexName}>
        <Configure
          hitsPerPage={6}
          getRankingInfo={true}
          aroundLatLng={aroundLatLng}
          aroundRadius={userLocation ? searchRadius : undefined}
        />

        {/* Search bar */}
        <TopSearchBar
          onLocationChange={handleLocationChange}
          userLocation={userLocation}
          searchRadius={searchRadius}
          onRadiusChange={handleRadiusChange}
        />

        <AlgoliaErrorBanner />

        {/* Filters sidebar + Results */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <SearchFilters
              onDateChange={handleDateChange}
              selectedDate={selectedDate}
            />
          </aside>
          <main>
            <SearchResults selectedDate={selectedDate} />
          </main>
        </div>
      </InstantSearch>
    </div>
  );
}

export default GeoSearch;
