import React, { useCallback, useState } from "react";
import { InstantSearch, Configure } from "react-instantsearch";
import {
  searchClient,
  indexName,
  isAlgoliaConfigured,
  DEFAULT_SEARCH_RADIUS,
} from "../../../lib/algoliaClient.js";
import Card from "../ui/Card.jsx";
import GeoSearchBox from "./GeoSearchBox.jsx";
import SearchFilters from "./SearchFilters.jsx";
import SearchResults from "./SearchResults.jsx";

function AlgoliaNotConfigured() {
  return (
    <Card className="py-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30">
        <svg
          className="h-8 w-8 text-amber-600 dark:text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-ink dark:text-dark-ink">
        Search Not Configured
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted dark:text-dark-muted">
        Algolia search is not configured. Set the following environment variables:
      </p>
      <div className="mx-auto mt-4 max-w-sm rounded-xl bg-surface/60 p-4 text-left dark:bg-dark-surface/60">
        <code className="block text-xs text-muted dark:text-dark-muted">
          VITE_ALGOLIA_APP_ID=your_app_id
          <br />
          VITE_ALGOLIA_SEARCH_KEY=your_search_key
          <br />
          VITE_ALGOLIA_INDEX_NAME=daybnb_places
        </code>
      </div>
      <p className="mx-auto mt-4 max-w-md text-xs text-muted dark:text-dark-muted">
        See ALGOLIA_SETUP.md for detailed setup instructions.
      </p>
    </Card>
  );
}

const GeoSearch = React.memo(function GeoSearch({ className = "" }) {
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(DEFAULT_SEARCH_RADIUS);
  const [selectedDate, setSelectedDate] = useState(null);
  const [startTime, setStartTime] = useState(8);
  const [endTime, setEndTime] = useState(17);

  const handleLocationChange = useCallback((location) => {
    setUserLocation(location);
  }, []);

  const handleRadiusChange = useCallback((radius) => {
    setSearchRadius(radius);
  }, []);

  const handleDateChange = useCallback((date) => {
    setSelectedDate(date);
  }, []);

  const handleTimeRangeChange = useCallback((start, end) => {
    setStartTime(start);
    setEndTime(end);
  }, []);

  // If Algolia is not configured, show setup instructions
  if (!isAlgoliaConfigured) {
    return <AlgoliaNotConfigured />;
  }

  // Build Algolia configuration
  const aroundLatLng = userLocation
    ? `${userLocation.lat}, ${userLocation.lng}`
    : undefined;

  return (
    <div className={`space-y-6 ${className}`}>
      <InstantSearch
        searchClient={searchClient}
        indexName={indexName}
        future={{ preserveSharedStateOnUnmount: true }}
      >
        {/* Configure search parameters */}
        <Configure
          hitsPerPage={10}
          getRankingInfo={true}
          aroundLatLng={aroundLatLng}
          aroundRadius={userLocation ? searchRadius : undefined}
        />

        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold text-brand-700 dark:text-brand-400">
            Find nearby places
          </h2>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">
            Search for daytime stays near you with location-based search
          </p>
        </div>

        {/* Search and Filters Layout */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar with Search Box and Filters */}
          <div className="space-y-4 lg:col-span-1">
            {/* Search Box */}
            <Card className="space-y-4">
              <GeoSearchBox
                onLocationChange={handleLocationChange}
                onRadiusChange={handleRadiusChange}
                initialRadius={searchRadius}
              />
            </Card>

            {/* Filters */}
            <SearchFilters
              onDateChange={handleDateChange}
              onTimeRangeChange={handleTimeRangeChange}
              selectedDate={selectedDate}
              startTime={startTime}
              endTime={endTime}
            />
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <SearchResults />
          </div>
        </div>
      </InstantSearch>
    </div>
  );
});

export default GeoSearch;
