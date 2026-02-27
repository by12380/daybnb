import React, { useCallback, useMemo, useState } from "react";
import { useConfigure, useSearchBox } from "react-instantsearch";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { INPUT_STYLES } from "../ui/FormInput.jsx";
import {
  PROPERTY_TYPES,
  PLACE_TYPES,
  BOOKING_OPTIONS,
  STANDOUT_STAYS,
  AMENITY_GROUPS,
  SAFETY_FEATURES,
} from "../../utils/constants.js";

// ─── Icons ──────────────────────────────────────────────────

function FilterIcon({ className = "" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
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

// ─── Pill / Chip toggle ─────────────────────────────────────

function Chip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
          : "border-border bg-surface/60 text-muted hover:border-brand-200 hover:text-ink dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted dark:hover:border-brand-700"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Segmented control for Place Type ───────────────────────

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex overflow-hidden rounded-xl border border-border dark:border-dark-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3 py-2 text-xs font-medium transition ${
            value === opt.value
              ? "bg-ink text-panel dark:bg-dark-ink dark:text-dark-panel"
              : "bg-panel text-muted hover:bg-surface/80 dark:bg-dark-panel dark:text-dark-muted"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Collapsible section ────────────────────────────────────

function FilterSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border pt-3 dark:border-dark-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between"
      >
        <span className="text-sm font-semibold text-ink dark:text-dark-ink">{title}</span>
        <ChevronDownIcon className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Price Range Filter ─────────────────────────────────────

function PriceRangeFilter({ minPrice, maxPrice, onMinChange, onMaxChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-ink dark:text-dark-ink">Price/day</label>
        {(minPrice || maxPrice) && (
          <button type="button" onClick={() => { onMinChange(""); onMaxChange(""); }}
            className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Clear
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted dark:text-dark-muted">$</span>
          <input type="number" min={0} value={minPrice} onChange={(e) => onMinChange(e.target.value)} placeholder="Min"
            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 pl-5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink dark:placeholder:text-dark-muted" />
        </div>
        <span className="text-xs text-muted dark:text-dark-muted">&ndash;</span>
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted dark:text-dark-muted">$</span>
          <input type="number" min={0} value={maxPrice} onChange={(e) => onMaxChange(e.target.value)} placeholder="Max"
            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 pl-5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink dark:placeholder:text-dark-muted" />
        </div>
      </div>
    </div>
  );
}

// ─── Active filter chips summary ────────────────────────────

function ActiveFilters({ items, onRemove, onClearAll }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink dark:text-dark-ink">Selected</span>
        <button type="button" onClick={onClearAll} className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Clear all
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/80 px-2.5 py-1 text-xs text-ink dark:border-dark-border dark:bg-dark-surface/80 dark:text-dark-ink">
            {item.label}
            <button type="button" onClick={() => onRemove(item.key)} className="ml-0.5 text-muted hover:text-ink dark:text-dark-muted">&times;</button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

const SearchFilters = React.memo(function SearchFilters({
  onDateChange,
  onFiltersChange,
  selectedDate,
}) {
  const { refine: refineSearch } = useSearchBox();

  const [isExpanded, setIsExpanded] = useState(true);

  // Existing filters
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minGuests, setMinGuests] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState([]);

  // New filters
  const [placeType, setPlaceType] = useState("any");
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState([]);
  const [minBeds, setMinBeds] = useState(0);
  const [minBathrooms, setMinBathrooms] = useState(0);
  const [instantBook, setInstantBook] = useState(false);
  const [selfCheckin, setSelfCheckin] = useState(false);
  const [allowsPets, setAllowsPets] = useState(false);
  const [guestFavorite, setGuestFavorite] = useState(false);
  const [luxe, setLuxe] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedSafety, setSelectedSafety] = useState([]);

  const availableTypes = ["suite", "resort", "villa", "room", "studio"];

  // Build Algolia filters string — string facet values must be quoted
  const filters = useMemo(() => {
    const parts = [];

    if (minPrice && Number(minPrice) > 0) parts.push(`price_per_day >= ${Number(minPrice)}`);
    if (maxPrice && Number(maxPrice) > 0) parts.push(`price_per_day <= ${Number(maxPrice)}`);
    if (minGuests > 1) parts.push(`guests >= ${minGuests}`);

    if (selectedTypes.length > 0) {
      parts.push(`(${selectedTypes.map((t) => `type:"${t}"`).join(" OR ")})`);
    }

    if (selectedPropertyTypes.length > 0) {
      parts.push(`(${selectedPropertyTypes.map((t) => `property_type:"${t}"`).join(" OR ")})`);
    }

    if (placeType && placeType !== "any") {
      parts.push(`place_type:"${placeType}"`);
    }

    if (minBeds > 0) parts.push(`beds >= ${minBeds}`);
    if (minBathrooms > 0) parts.push(`bathrooms >= ${minBathrooms}`);

    if (instantBook) parts.push(`instant_book:true`);
    if (selfCheckin) parts.push(`self_checkin:true`);
    if (allowsPets) parts.push(`allows_pets:true`);

    if (guestFavorite) parts.push(`is_guest_favorite:true`);
    if (luxe) parts.push(`is_luxe:true`);

    selectedAmenities.forEach((a) => parts.push(`amenities:"${a}"`));
    selectedSafety.forEach((s) => parts.push(`safety_features:"${s}"`));

    if (selectedDate) parts.push(`NOT booked_dates:"${selectedDate}"`);

    const result = parts.join(" AND ");
    if (result) console.log("[Algolia filters]", result);
    return result;
  }, [
    minPrice, maxPrice, minGuests, selectedTypes, selectedPropertyTypes,
    placeType, minBeds, minBathrooms, instantBook, selfCheckin, allowsPets,
    guestFavorite, luxe, selectedAmenities, selectedSafety, selectedDate,
  ]);

  useConfigure({ filters: filters || undefined });

  const handleDateChange = useCallback((_, dateString) => {
    onDateChange?.(dateString || null);
  }, [onDateChange]);

  const handleTypeToggle = useCallback((type) => {
    setSelectedTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  }, []);

  const handlePropertyTypeToggle = useCallback((type) => {
    setSelectedPropertyTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  }, []);

  const handleAmenityToggle = useCallback((val) => {
    setSelectedAmenities((prev) => prev.includes(val) ? prev.filter((a) => a !== val) : [...prev, val]);
  }, []);

  const handleSafetyToggle = useCallback((val) => {
    setSelectedSafety((prev) => prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]);
  }, []);

  // Build list of active filter chips for summary
  const activeFilterItems = useMemo(() => {
    const items = [];
    if (minPrice && Number(minPrice) > 0) items.push({ key: "minPrice", label: `Min $${minPrice}` });
    if (maxPrice && Number(maxPrice) > 0) items.push({ key: "maxPrice", label: `Max $${maxPrice}` });
    if (minGuests > 1) items.push({ key: "minGuests", label: `${minGuests}+ guests` });
    selectedTypes.forEach((t) => items.push({ key: `type-${t}`, label: t }));
    selectedPropertyTypes.forEach((t) => items.push({ key: `pt-${t}`, label: t }));
    if (placeType !== "any") items.push({ key: "placeType", label: placeType === "room" ? "Room" : "Entire home" });
    if (minBeds > 0) items.push({ key: "minBeds", label: `${minBeds}+ beds` });
    if (minBathrooms > 0) items.push({ key: "minBathrooms", label: `${minBathrooms}+ baths` });
    if (instantBook) items.push({ key: "instantBook", label: "Instant Book" });
    if (selfCheckin) items.push({ key: "selfCheckin", label: "Self check-in" });
    if (allowsPets) items.push({ key: "allowsPets", label: "Allows pets" });
    if (guestFavorite) items.push({ key: "guestFavorite", label: "Guest favorite" });
    if (luxe) items.push({ key: "luxe", label: "Luxe" });
    selectedAmenities.forEach((a) => items.push({ key: `am-${a}`, label: a.replace(/_/g, " ") }));
    selectedSafety.forEach((s) => items.push({ key: `sf-${s}`, label: s.replace(/_/g, " ") }));
    return items;
  }, [
    minPrice, maxPrice, minGuests, selectedTypes, selectedPropertyTypes,
    placeType, minBeds, minBathrooms, instantBook, selfCheckin, allowsPets,
    guestFavorite, luxe, selectedAmenities, selectedSafety,
  ]);

  const handleRemoveFilter = useCallback((key) => {
    if (key === "minPrice") setMinPrice("");
    else if (key === "maxPrice") setMaxPrice("");
    else if (key === "minGuests") setMinGuests(1);
    else if (key === "placeType") setPlaceType("any");
    else if (key === "minBeds") setMinBeds(0);
    else if (key === "minBathrooms") setMinBathrooms(0);
    else if (key === "instantBook") setInstantBook(false);
    else if (key === "selfCheckin") setSelfCheckin(false);
    else if (key === "allowsPets") setAllowsPets(false);
    else if (key === "guestFavorite") setGuestFavorite(false);
    else if (key === "luxe") setLuxe(false);
    else if (key.startsWith("type-")) handleTypeToggle(key.replace("type-", ""));
    else if (key.startsWith("pt-")) handlePropertyTypeToggle(key.replace("pt-", ""));
    else if (key.startsWith("am-")) handleAmenityToggle(key.replace("am-", ""));
    else if (key.startsWith("sf-")) handleSafetyToggle(key.replace("sf-", ""));
  }, [handleTypeToggle, handlePropertyTypeToggle, handleAmenityToggle, handleSafetyToggle]);

  const resetAll = useCallback(() => {
    refineSearch("");
    setMinPrice(""); setMaxPrice(""); setMinGuests(1); setSelectedTypes([]);
    setPlaceType("any"); setSelectedPropertyTypes([]); setMinBeds(0); setMinBathrooms(0);
    setInstantBook(false); setSelfCheckin(false); setAllowsPets(false);
    setGuestFavorite(false); setLuxe(false);
    setSelectedAmenities([]); setSelectedSafety([]);
    onDateChange?.(null);
  }, [refineSearch, onDateChange]);

  const hasActiveFilters = activeFilterItems.length > 0;

  return (
    <div className="flex max-h-[calc(100vh-6rem)] flex-col rounded-2xl border border-border bg-panel dark:border-dark-border dark:bg-dark-panel">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-border/50 bg-panel px-4 py-3 dark:border-dark-border/50 dark:bg-dark-panel">
        <button type="button" onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2">
          <FilterIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <span className="font-semibold text-ink dark:text-dark-ink">Filters</span>
          {hasActiveFilters && (
            <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{activeFilterItems.length}</span>
          )}
          <ChevronDownIcon className={`h-4 w-4 text-muted transition-transform dark:text-dark-muted ${isExpanded ? "rotate-180" : ""}`} />
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetAll}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            title="Reset all filters"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {isExpanded && (
        <>
          {/* Scrollable Filter Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 scrollbar-thin">
            <div className="space-y-4">
              {/* Active filter chips */}
              <ActiveFilters items={activeFilterItems} onRemove={handleRemoveFilter} onClearAll={resetAll} />

              {/* Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink dark:text-dark-ink">Date</label>
                <DatePicker
                  className={INPUT_STYLES}
                  placeholder="Select date"
                  value={selectedDate ? dayjs(selectedDate) : null}
                  onChange={handleDateChange}
                  disabledDate={(current) => current && current < dayjs().startOf("day")}
                />
              </div>

              {/* Type of Place */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink dark:text-dark-ink">Type of place</label>
                <SegmentedControl options={PLACE_TYPES} value={placeType} onChange={setPlaceType} />
              </div>

              {/* Price Range */}
              <PriceRangeFilter minPrice={minPrice} maxPrice={maxPrice} onMinChange={setMinPrice} onMaxChange={setMaxPrice} />

              {/* Beds & Bathrooms */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ink dark:text-dark-ink">Beds</label>
                  <select value={minBeds} onChange={(e) => setMinBeds(Number(e.target.value))} className={INPUT_STYLES + " w-full"}>
                    <option value={0}>Any</option>
                    {[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n}+</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ink dark:text-dark-ink">Bathrooms</label>
                  <select value={minBathrooms} onChange={(e) => setMinBathrooms(Number(e.target.value))} className={INPUT_STYLES + " w-full"}>
                    <option value={0}>Any</option>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
                  </select>
                </div>
              </div>

              {/* Booking Options */}
              <FilterSection title="Booking options" defaultOpen>
                <div className="flex flex-wrap gap-2">
                  {BOOKING_OPTIONS.map((opt) => {
                    const stateMap = { instant_book: instantBook, self_checkin: selfCheckin, allows_pets: allowsPets };
                    const setterMap = { instant_book: setInstantBook, self_checkin: setSelfCheckin, allows_pets: setAllowsPets };
                    return (
                      <Chip
                        key={opt.value}
                        label={opt.label}
                        active={stateMap[opt.value]}
                        onClick={() => setterMap[opt.value]((prev) => !prev)}
                      />
                    );
                  })}
                </div>
              </FilterSection>

              {/* Standout Stays */}
              <FilterSection title="Standout stays" defaultOpen>
                <div className="flex flex-wrap gap-2">
                  {STANDOUT_STAYS.map((opt) => {
                    const stateMap = { is_guest_favorite: guestFavorite, is_luxe: luxe };
                    const setterMap = { is_guest_favorite: setGuestFavorite, is_luxe: setLuxe };
                    return (
                      <Chip
                        key={opt.value}
                        label={opt.label}
                        active={stateMap[opt.value]}
                        onClick={() => setterMap[opt.value]((prev) => !prev)}
                      />
                    );
                  })}
                </div>
              </FilterSection>

              {/* Property Type */}
              <FilterSection title="Property type" defaultOpen>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map((pt) => (
                    <Chip
                      key={pt.value}
                      label={pt.label}
                      active={selectedPropertyTypes.includes(pt.value)}
                      onClick={() => handlePropertyTypeToggle(pt.value)}
                    />
                  ))}
                </div>
              </FilterSection>

              {/* Room Type */}
              {availableTypes.length > 0 && (
                <FilterSection title="Room type">
                  <div className="flex flex-wrap gap-2">
                    {availableTypes.map((type) => (
                      <Chip key={type} label={type} active={selectedTypes.includes(type)} onClick={() => handleTypeToggle(type)} />
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Amenities */}
              <FilterSection title="Amenities">
                {AMENITY_GROUPS.map((group) => (
                  <div key={group.label} className="space-y-1.5">
                    <span className="text-xs font-semibold text-ink/60 dark:text-dark-ink/60">{group.label}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <Chip
                          key={item.value}
                          label={item.label}
                          active={selectedAmenities.includes(item.value)}
                          onClick={() => handleAmenityToggle(item.value)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </FilterSection>

              {/* Safety */}
              <FilterSection title="Safety">
                <div className="flex flex-wrap gap-2">
                  {SAFETY_FEATURES.map((item) => (
                    <Chip
                      key={item.value}
                      label={item.label}
                      active={selectedSafety.includes(item.value)}
                      onClick={() => handleSafetyToggle(item.value)}
                    />
                  ))}
                </div>
              </FilterSection>
            </div>
          </div>

          {/* Sticky Bottom Reset Button */}
          <div className="sticky bottom-0 rounded-b-2xl border-t border-border/50 bg-panel px-4 py-3 dark:border-dark-border/50 dark:bg-dark-panel">
            <button
              type="button"
              onClick={resetAll}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-sm font-medium text-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-muted dark:hover:border-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset All Filters
            </button>
          </div>
        </>
      )}
    </div>
  );
});

export default SearchFilters;
