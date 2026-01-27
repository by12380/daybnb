import React, { useCallback, useMemo, useState } from "react";
import { useConfigure, useSearchBox } from "react-instantsearch";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { INPUT_STYLES } from "../ui/FormInput.jsx";

// Time options for 8am-5pm range
function buildTimeOptions() {
  const options = [];
  for (let hour = 8; hour <= 17; hour++) {
    const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const suffix = hour >= 12 ? "PM" : "AM";
    options.push({
      value: hour,
      label: `${h12}:00 ${suffix}`,
    });
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

function FilterIcon({ className = "" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className = "" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// Price Range Filter - uses local state and updates Algolia filters
function PriceRangeFilter({ minPrice, maxPrice, onMinChange, onMaxChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-ink dark:text-dark-ink">
          Price/hour
        </label>
        {(minPrice || maxPrice) && (
          <button
            type="button"
            onClick={() => {
              onMinChange("");
              onMaxChange("");
            }}
            className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted dark:text-dark-muted">
            $
          </span>
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => onMinChange(e.target.value)}
            placeholder="Min"
            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 pl-5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink dark:placeholder:text-dark-muted"
          />
        </div>
        <span className="text-xs text-muted dark:text-dark-muted">–</span>
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted dark:text-dark-muted">
            $
          </span>
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => onMaxChange(e.target.value)}
            placeholder="Max"
            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 pl-5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink dark:placeholder:text-dark-muted"
          />
        </div>
      </div>
    </div>
  );
}

// Room Type Filter
function TypeFilter({ selectedTypes, onTypeToggle, availableTypes }) {
  if (availableTypes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-ink dark:text-dark-ink">Room Type</label>
      <div className="flex flex-wrap gap-2">
        {availableTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onTypeToggle(type)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              selectedTypes.includes(type)
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
                : "border-border bg-surface/60 text-muted hover:border-brand-200 hover:text-ink dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted dark:hover:border-brand-700"
            }`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );
}

// Guests Filter
function GuestsFilter({ minGuests, onGuestsChange }) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-ink dark:text-dark-ink">Minimum Guests</label><br/>
      <select value={minGuests} onChange={(e) => onGuestsChange(Number(e.target.value))} className={INPUT_STYLES}>
        {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
          <option key={num} value={num}>
            {num}+ guests
          </option>
        ))}
      </select>
    </div>
  );
}

const SearchFilters = React.memo(function SearchFilters({
  onDateChange,
  onTimeRangeChange,
  onFiltersChange,
  selectedDate,
  startTime,
  endTime,
}) {
  const { refine: refineSearch } = useSearchBox();
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [localStartTime, setLocalStartTime] = useState(startTime || 8);
  const [localEndTime, setLocalEndTime] = useState(endTime || 17);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minGuests, setMinGuests] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState([]);

  const availableTypes = ["suite", "resort", "villa", "room", "studio"];

  // Build Algolia filters string
  const filters = useMemo(() => {
    const parts = [];
    
    if (minPrice && Number(minPrice) > 0) {
      parts.push(`price_per_hour >= ${Number(minPrice)}`);
    }
    if (maxPrice && Number(maxPrice) > 0) {
      parts.push(`price_per_hour <= ${Number(maxPrice)}`);
    }
    if (minGuests > 1) {
      parts.push(`guests >= ${minGuests}`);
    }
    if (selectedTypes.length > 0) {
      const typeFilters = selectedTypes.map(t => `type:${t}`).join(" OR ");
      parts.push(`(${typeFilters})`);
    }
    
    return parts.join(" AND ");
  }, [minPrice, maxPrice, minGuests, selectedTypes]);

  // Apply filters to Algolia via Configure
  useConfigure({ filters: filters || undefined });

  // Filter end time options based on start time
  const endTimeOptions = useMemo(() => {
    return TIME_OPTIONS.filter((opt) => opt.value > localStartTime);
  }, [localStartTime]);

  const handleDateChange = useCallback(
    (_, dateString) => {
      onDateChange?.(dateString || null);
    },
    [onDateChange]
  );

  const handleStartTimeChange = useCallback(
    (e) => {
      const value = Number(e.target.value);
      setLocalStartTime(value);
      // Ensure end time is after start time
      if (localEndTime <= value) {
        const newEndTime = Math.min(value + 1, 17);
        setLocalEndTime(newEndTime);
        onTimeRangeChange?.(value, newEndTime);
      } else {
        onTimeRangeChange?.(value, localEndTime);
      }
    },
    [localEndTime, onTimeRangeChange]
  );

  const handleEndTimeChange = useCallback(
    (e) => {
      const value = Number(e.target.value);
      setLocalEndTime(value);
      onTimeRangeChange?.(localStartTime, value);
    },
    [localStartTime, onTimeRangeChange]
  );

  const handleTypeToggle = useCallback((type) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-panel p-4 dark:border-dark-border dark:bg-dark-panel">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <FilterIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <span className="font-semibold text-ink dark:text-dark-ink">Filters</span>
        </div>
        <ChevronDownIcon
          className={`h-5 w-5 text-muted transition-transform dark:text-dark-muted ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Filter Content */}
      {isExpanded && (
        <div className="mt-4 space-y-6">
          {/* Date Filter */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-ink dark:text-dark-ink mr-2">Date</label>
            <DatePicker
              className={INPUT_STYLES}
              placeholder="Select date"
              value={selectedDate ? dayjs(selectedDate) : null}
              onChange={handleDateChange}
              disabledDate={(current) => current && current < dayjs().startOf("day")}
            />
          </div>

          {/* Time Range Filter */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-ink dark:text-dark-ink">
              Time Range (8 AM – 5 PM)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="mb-1 block text-xs text-muted dark:text-dark-muted">From</span>
                <select
                  value={localStartTime}
                  onChange={handleStartTimeChange}
                  className={INPUT_STYLES}
                >
                  {TIME_OPTIONS.filter((opt) => opt.value < 17).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="mb-1 block text-xs text-muted dark:text-dark-muted">To</span>
                <select
                  value={localEndTime}
                  onChange={handleEndTimeChange}
                  className={INPUT_STYLES}
                >
                  {endTimeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Price Range */}
          <PriceRangeFilter
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinChange={setMinPrice}
            onMaxChange={setMaxPrice}
          />

          {/* Room Type */}
          <TypeFilter
            selectedTypes={selectedTypes}
            onTypeToggle={handleTypeToggle}
            availableTypes={availableTypes}
          />

          {/* Guests */}
          {/* <GuestsFilter
            minGuests={minGuests}
            onGuestsChange={setMinGuests}
          /> */}

          {/* Reset All Filters Button */}
          <button
            type="button"
            onClick={() => {
              // Clear search query
              refineSearch("");
              // Clear all filter states
              setMinPrice("");
              setMaxPrice("");
              setMinGuests(1);
              setSelectedTypes([]);
              setLocalStartTime(8);
              setLocalEndTime(17);
              onDateChange?.(null);
              onTimeRangeChange?.(8, 17);
            }}
            className="w-full rounded-xl border border-border bg-surface/60 px-4 py-2 text-sm font-medium text-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted dark:hover:border-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
});

export default SearchFilters;
