import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../redux/api.js";

const StarIcon = ({ className = "h-4 w-4" }) => (
  <svg className={`${className} fill-amber-400 text-amber-400`} viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const HostProfile = React.memo(() => {
  const { hostId } = useParams();
  const [host, setHost] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [coHosts, setCoHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHost = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/hosts/${hostId}`);
        setHost(data.host);
        setListings(data.listings || []);
        setReviews(data.reviews || []);
        setCoHosts(data.co_hosts || []);
      } catch (err) {
        setError(err.message || "Host not found");
      }
      setLoading(false);
    };
    fetchHost();
  }, [hostId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted dark:text-dark-muted">Loading host profile...</p>
        </div>
      </div>
    );
  }

  if (error || !host) {
    return (
      <div className="py-16 text-center">
        <svg className="mx-auto h-16 w-16 text-muted/30 dark:text-dark-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <p className="mt-4 text-lg font-semibold text-ink dark:text-dark-ink">Host not found</p>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">{error || "This host profile doesn't exist."}</p>
        <Link to="/hosts" className="mt-4 inline-block rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700">
          Browse all hosts
        </Link>
      </div>
    );
  }

  const joinedDate = host.created_at
    ? new Date(host.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : host.host_since || "";

  return (
    <div className="space-y-8">
      {/* Cover + avatar */}
      <div className="relative">
        <div className="h-48 overflow-hidden rounded-3xl bg-gradient-to-r from-brand-500 to-brand-400 sm:h-64">
          {host.cover_photo_url && (
            <img src={host.cover_photo_url} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>
        <div className="absolute -bottom-12 left-6 sm:left-10">
          <div className="relative">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-brand-100 text-4xl font-bold text-brand-600 shadow-xl dark:border-dark-panel dark:bg-brand-900/50 dark:text-brand-300">
              {host.avatar_url ? (
                <img src={host.avatar_url} alt={host.full_name} className="h-full w-full rounded-full object-cover" />
              ) : (
                (host.full_name || "H").charAt(0).toUpperCase()
              )}
            </div>
            {host.is_superhost && (
              <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 ring-3 ring-white dark:ring-dark-panel">
                <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Host info header */}
      <div className="pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-ink dark:text-dark-ink">
                {host.full_name || "Host"}
              </h1>
              {host.is_superhost && (
                <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                  Superhost
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted dark:text-dark-muted">
              {host.location && (
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {host.location}
                </span>
              )}
              {joinedDate && <span>Joined {joinedDate}</span>}
            </div>
          </div>
          <button className="shrink-0 rounded-xl border border-brand-600 bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 dark:border-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500">
            Contact Host
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {host.rating > 0 && (
          <div className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm dark:border-dark-border dark:bg-dark-panel">
            <div className="flex items-center justify-center gap-1">
              <StarIcon className="h-5 w-5" />
              <span className="text-2xl font-bold text-ink dark:text-dark-ink">{host.rating}</span>
            </div>
            <p className="mt-1 text-xs text-muted dark:text-dark-muted">Rating</p>
          </div>
        )}
        <div className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm dark:border-dark-border dark:bg-dark-panel">
          <p className="text-2xl font-bold text-ink dark:text-dark-ink">{host.review_count}</p>
          <p className="mt-1 text-xs text-muted dark:text-dark-muted">Reviews</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm dark:border-dark-border dark:bg-dark-panel">
          <p className="text-2xl font-bold text-ink dark:text-dark-ink">{host.years_hosting || 0}</p>
          <p className="mt-1 text-xs text-muted dark:text-dark-muted">Years hosting</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm dark:border-dark-border dark:bg-dark-panel">
          <p className="text-2xl font-bold text-ink dark:text-dark-ink">{host.listing_count}</p>
          <p className="mt-1 text-xs text-muted dark:text-dark-muted">Listings</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-8 lg:col-span-2">
          {/* About */}
          {host.bio && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">About {(host.full_name || "").split(" ")[0] || "this host"}</h2>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-muted dark:text-dark-muted">
                  {host.bio}
                </p>
              </div>
              <hr className="border-border dark:border-dark-border" />
            </>
          )}

          {/* Specialties */}
          {host.specialties?.length > 0 && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Specialties</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {host.specialties.map((s) => (
                    <span key={s} className="rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <hr className="border-border dark:border-dark-border" />
            </>
          )}

          {/* Co-hosts */}
          {coHosts.length > 0 && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Co-hosts</h2>
                <div className="mt-4 flex flex-wrap gap-4">
                  {coHosts.map((ch) => (
                    <div key={ch.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3 dark:border-dark-border dark:bg-dark-surface/40">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                        {ch.avatar_url ? (
                          <img src={ch.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          (ch.full_name || "C").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink dark:text-dark-ink">{ch.full_name || "Co-host"}</p>
                        {ch.is_superhost && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">Superhost</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <hr className="border-border dark:border-dark-border" />
            </>
          )}

          {/* Listings */}
          {listings.length > 0 && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">
                  {(host.full_name || "").split(" ")[0] || "Host"}'s listings
                </h2>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  {listings.map((listing) => (
                    <Link key={listing.id} to={`/room/${listing.id}`} className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-dark-border dark:bg-dark-panel">
                      <div className="relative h-44 overflow-hidden bg-brand-50 dark:bg-brand-900/20">
                        {(listing.image || listing.images?.[0]) ? (
                          <img
                            src={listing.image || listing.images[0]}
                            alt={listing.title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-brand-300">
                            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-2.5 py-1 text-sm font-bold text-ink shadow backdrop-blur dark:bg-dark-panel/90 dark:text-dark-ink">
                          ${listing.price_per_day}<span className="text-xs font-normal text-muted dark:text-dark-muted"> /day</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="truncate text-sm font-semibold text-ink dark:text-dark-ink group-hover:text-brand-600 dark:group-hover:text-brand-400">
                          {listing.title}
                        </h3>
                        <div className="mt-1.5 flex items-center justify-between text-xs text-muted dark:text-dark-muted">
                          {listing.location && (
                            <span className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {listing.location}
                            </span>
                          )}
                          <span>{listing.guests} guest{listing.guests !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <hr className="border-border dark:border-dark-border" />
            </>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Guest reviews</h2>
                {host.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <StarIcon />
                    <span className="text-sm font-semibold text-ink dark:text-dark-ink">{host.rating}</span>
                    <span className="text-sm text-muted dark:text-dark-muted">({host.review_count} reviews)</span>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-border bg-surface/40 p-5 dark:border-dark-border dark:bg-dark-surface/40">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                        {review.reviewer?.avatar_url ? (
                          <img src={review.reviewer.avatar_url} alt="" className="h-full w-full rounded-full object-cover" loading="lazy" />
                        ) : (
                          (review.reviewer?.full_name || "G").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-ink dark:text-dark-ink">{review.reviewer?.full_name || "Guest"}</p>
                          <div className="flex gap-0.5">
                            {Array.from({ length: review.rating }, (_, i) => (
                              <StarIcon key={i} className="h-3.5 w-3.5" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-muted dark:text-dark-muted">
                          {new Date(review.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </p>
                        {review.comment && (
                          <p className="mt-2 text-sm leading-relaxed text-ink/80 dark:text-dark-ink/80">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Host details card */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-md dark:border-dark-border dark:bg-dark-panel">
              <h3 className="text-base font-semibold text-ink dark:text-dark-ink">Host details</h3>
              <div className="mt-4 space-y-4">
                {host.languages?.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30">
                      <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink dark:text-dark-ink">Languages</p>
                      <p className="text-sm text-muted dark:text-dark-muted">{host.languages.join(", ")}</p>
                    </div>
                  </div>
                )}
                {host.response_time && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                      <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink dark:text-dark-ink">Response time</p>
                      <p className="text-sm text-muted dark:text-dark-muted">Responds {host.response_time}</p>
                    </div>
                  </div>
                )}
                {host.response_rate > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                      <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink dark:text-dark-ink">Response rate</p>
                      <p className="text-sm text-muted dark:text-dark-muted">{host.response_rate}%</p>
                    </div>
                  </div>
                )}
                {host.identity_verified && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/30">
                      <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink dark:text-dark-ink">Identity verified</p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">Confirmed</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Co-host CTA */}
            {host.accepts_cohosts && (
              <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 p-6 dark:border-brand-700 dark:bg-brand-900/20">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/50">
                    <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink dark:text-dark-ink">Looking for a co-host?</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted dark:text-dark-muted">
                      {(host.full_name || "").split(" ")[0] || "This host"} is available for co-hosting opportunities. Reach out to discuss partnership options.
                    </p>
                    <button className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700">
                      Inquire about co-hosting
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Back to all hosts */}
            <Link
              to="/hosts"
              className="flex items-center gap-2 text-sm font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to all hosts
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
});

export default HostProfile;
