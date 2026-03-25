import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../redux/api.js";

const StarIcon = () => (
  <svg className="h-4 w-4 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const HostCard = React.memo(({ host }) => (
  <Link to={`/hosts/${host.id}`} className="group block">
    <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10 dark:border-dark-border dark:bg-dark-panel dark:hover:shadow-brand-500/5">
      {host.is_superhost && (
        <div className="absolute right-4 top-4">
          <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
            Superhost
          </span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600 ring-2 ring-brand-100 ring-offset-2 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-800 dark:ring-offset-dark-panel">
            {host.avatar_url ? (
              <img src={host.avatar_url} alt={host.full_name} className="h-full w-full rounded-full object-cover" loading="lazy" />
            ) : (
              (host.full_name || "H").charAt(0).toUpperCase()
            )}
          </div>
          {host.is_superhost && (
            <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-dark-panel">
              <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-ink dark:text-dark-ink group-hover:text-brand-600 dark:group-hover:text-brand-400">
            {host.full_name || "Host"}
          </h3>
          {host.location && (
            <p className="flex items-center gap-1 text-sm text-muted dark:text-dark-muted">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {host.location}
            </p>
          )}
        </div>
      </div>

      {host.bio && (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted dark:text-dark-muted">
          {host.bio}
        </p>
      )}

      <div className="mt-4 flex items-center gap-4">
        {host.rating > 0 && (
          <>
            <div className="flex items-center gap-1">
              <StarIcon />
              <span className="text-sm font-semibold text-ink dark:text-dark-ink">{host.rating}</span>
              <span className="text-xs text-muted dark:text-dark-muted">({host.review_count})</span>
            </div>
            <div className="h-4 w-px bg-border dark:bg-dark-border" />
          </>
        )}
        {host.years_hosting > 0 && (
          <>
            <span className="text-xs text-muted dark:text-dark-muted">{host.years_hosting} yr{host.years_hosting !== 1 ? "s" : ""} hosting</span>
            <div className="h-4 w-px bg-border dark:bg-dark-border" />
          </>
        )}
        <span className="text-xs text-muted dark:text-dark-muted">{host.listing_count} listing{host.listing_count !== 1 ? "s" : ""}</span>
      </div>

      {host.specialties?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {host.specialties.map((s) => (
            <span key={s} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  </Link>
));

const FindHosts = React.memo(() => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHosts = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (search.trim()) params.search = search.trim();
        if (filter === "superhost") params.superhost = "true";
        const { data } = await api.get("/hosts", { params });
        setHosts(data.hosts || []);
      } catch (err) {
        setError(err.message || "Failed to load hosts");
      }
      setLoading(false);
    };

    const debounce = setTimeout(fetchHosts, 300);
    return () => clearTimeout(debounce);
  }, [search, filter]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink dark:text-dark-ink sm:text-4xl">
          Find a <span className="text-gradient dark:text-gradient-dark">Host</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted dark:text-dark-muted">
          Discover experienced hosts who offer amazing day-use spaces. Browse profiles, check ratings, and find the perfect host for your next daycation.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <div className="relative w-full max-w-md">
          <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted dark:text-dark-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, location, or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-border bg-white py-3 pl-12 pr-4 text-sm text-ink shadow-sm transition placeholder:text-muted/60 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-dark-border dark:bg-dark-panel dark:text-dark-ink dark:placeholder:text-dark-muted/60 dark:focus:border-brand-600 dark:focus:ring-brand-800"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
              filter === "all"
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/30"
                : "border border-border bg-white text-ink hover:border-brand-300 dark:border-dark-border dark:bg-dark-panel dark:text-dark-ink dark:hover:border-brand-700"
            }`}
          >
            All Hosts
          </button>
          <button
            onClick={() => setFilter("superhost")}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
              filter === "superhost"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30"
                : "border border-border bg-white text-ink hover:border-amber-300 dark:border-dark-border dark:bg-dark-panel dark:text-dark-ink dark:hover:border-amber-700"
            }`}
          >
            Superhosts
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            <p className="mt-4 text-sm text-muted dark:text-dark-muted">Loading hosts...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      ) : hosts.length === 0 ? (
        <div className="py-16 text-center">
          <svg className="mx-auto h-16 w-16 text-muted/30 dark:text-dark-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="mt-4 text-lg font-semibold text-ink dark:text-dark-ink">No hosts found</p>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {hosts.map((host) => (
            <HostCard key={host.id} host={host} />
          ))}
        </div>
      )}

      <div className="rounded-3xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 px-6 py-12 text-white shadow-2xl shadow-brand-500/20">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Become a Host on Daybnb</h2>
            <p className="mt-2 text-sm text-white/80">
              Have a space to share? List your property and start earning by offering day-use access to guests.
            </p>
          </div>
          <Link
            to="/auth"
            className="shrink-0 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-600 shadow-lg transition hover:bg-brand-50"
          >
            Start Hosting
          </Link>
        </div>
      </div>
    </div>
  );
});

export default FindHosts;
