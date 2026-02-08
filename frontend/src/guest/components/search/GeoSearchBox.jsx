import React, { useCallback, useEffect, useState } from "react";
import { useSearchBox } from "react-instantsearch";
import { getUserLocation, DEFAULT_SEARCH_RADIUS } from "../../../lib/algoliaClient.js";
import { INPUT_STYLES } from "../ui/FormInput.jsx";

function LocationIcon({ className = "" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function CrosshairIcon({ className = "" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
      <line x1="12" y1="2" x2="12" y2="6" strokeWidth={2} />
      <line x1="12" y1="18" x2="12" y2="22" strokeWidth={2} />
      <line x1="2" y1="12" x2="6" y2="12" strokeWidth={2} />
      <line x1="18" y1="12" x2="22" y2="12" strokeWidth={2} />
    </svg>
  );
}

function SpinnerIcon({ className = "" }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

const GeoSearchBox = React.memo(function GeoSearchBox({
  onLocationChange,
  onRadiusChange,
  initialRadius = DEFAULT_SEARCH_RADIUS,
}) {
  const { query, refine: refineQuery } = useSearchBox();

  const [searchText, setSearchText] = useState(query);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [radius, setRadius] = useState(initialRadius);
  const [useGeoLocation, setUseGeoLocation] = useState(false);

  // Radius options in meters
  const radiusOptions = [
    { value: 5000, label: "5 km" },
    { value: 10000, label: "10 km" },
    { value: 25000, label: "25 km" },
    { value: 50000, label: "50 km" },
    { value: 100000, label: "100 km" },
    { value: 200000, label: "200 km" },
  ];

  // Handle text search
  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchText(value);
      refineQuery(value);
    },
    [refineQuery]
  );

  // Get user's current location
  const handleGetLocation = useCallback(async () => {
    setLocationError("");
    setLoadingLocation(true);

    try {
      const location = await getUserLocation();
      setUserLocation(location);
      setUseGeoLocation(true);
      onLocationChange?.(location);
    } catch (error) {
      setLocationError(error.message);
      setUseGeoLocation(false);
    } finally {
      setLoadingLocation(false);
    }
  }, [onLocationChange]);

  // Clear geo location filter
  const handleClearLocation = useCallback(() => {
    setUserLocation(null);
    setUseGeoLocation(false);
    setLocationError("");
    onLocationChange?.(null);
  }, [onLocationChange]);

  // Handle radius change
  const handleRadiusChange = useCallback(
    (e) => {
      const newRadius = Number(e.target.value);
      setRadius(newRadius);
      onRadiusChange?.(newRadius);
    },
    [onRadiusChange]
  );

  // Update search text when query changes externally
  useEffect(() => {
    setSearchText(query);
  }, [query]);

  return (
    <div className="space-y-4">
      {/* Text Search */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-5 w-5 text-muted dark:text-dark-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="search"
          value={searchText}
          onChange={handleSearchChange}
          placeholder="Search by name, location, or type..."
          className={`${INPUT_STYLES} pl-10`}
        />
      </div>

      {/* Location Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Use My Location Button */}
        <button
          type="button"
          onClick={useGeoLocation ? handleClearLocation : handleGetLocation}
          disabled={loadingLocation}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
            useGeoLocation
              ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
              : "border-border bg-surface/60 text-ink hover:border-brand-200 hover:bg-brand-50 dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-ink dark:hover:border-brand-700 dark:hover:bg-brand-900/20"
          }`}
        >
          {loadingLocation ? (
            <SpinnerIcon className="h-4 w-4" />
          ) : useGeoLocation ? (
            <CrosshairIcon className="h-4 w-4" />
          ) : (
            <LocationIcon className="h-4 w-4" />
          )}
          {loadingLocation
            ? "Getting location..."
            : useGeoLocation
              ? "Using your location"
              : "Use my location"}
        </button>

        {/* Radius Selector (only show when using geo location) */}
        {useGeoLocation && (
          <label className="flex items-center gap-2">
            <span className="text-sm text-muted dark:text-dark-muted">within</span>
            <select
              value={radius}
              onChange={handleRadiusChange}
              className={`${INPUT_STYLES} w-auto py-2`}
            >
              {radiusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Location Status */}
      {userLocation && (
        <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
          <LocationIcon className="h-3.5 w-3.5" />
          Showing places near you ({userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)})
        </p>
      )}

      {/* Location Error */}
      {locationError && (
        <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          {locationError}
        </p>
      )}
    </div>
  );
});

export default GeoSearchBox;
