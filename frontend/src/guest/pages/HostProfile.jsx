import React from "react";
import { Link, useParams } from "react-router-dom";

const HOSTS_MAP = {
  h1: {
    id: "h1",
    name: "Sarah Mitchell",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
    coverPhoto: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=400&fit=crop",
    location: "Austin, TX",
    bio: "Superhost with a passion for design and hospitality. I love creating warm, inviting spaces for guests to enjoy during the day. With over 5 years of hosting experience, I've perfected the art of making every guest feel at home. My properties feature thoughtful touches — from fresh flowers to curated playlists — that transform a simple day booking into a memorable experience.",
    rating: 4.97,
    reviewCount: 234,
    yearsHosting: 5,
    listingCount: 4,
    responseRate: 99,
    responseTime: "within an hour",
    isSuperhost: true,
    identityVerified: true,
    languages: ["English", "Spanish"],
    specialties: ["Entire homes", "Pool access", "Pet-friendly"],
    joinedDate: "March 2021",
    listings: [
      { id: "l1", title: "Sunny Modern Home with Pool", image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop", price: 85, rating: 4.98, reviewCount: 72, location: "Austin, TX", guests: 8 },
      { id: "l2", title: "Cozy Downtown Studio", image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop", price: 45, rating: 4.95, reviewCount: 58, location: "Austin, TX", guests: 2 },
      { id: "l3", title: "Lakeside Retreat with Dock", image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600&h=400&fit=crop", price: 120, rating: 4.99, reviewCount: 64, location: "Lake Travis, TX", guests: 12 },
      { id: "l4", title: "Artist's Garden Cottage", image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop", price: 65, rating: 4.96, reviewCount: 40, location: "Austin, TX", guests: 4 },
    ],
    reviews: [
      { id: "r1", name: "Jordan M.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", rating: 5, date: "February 2026", text: "Sarah's pool house was absolutely perfect for our family day trip. Everything was sparkling clean, she left snacks and drinks, and even had pool toys for the kids. Will definitely book again!" },
      { id: "r2", name: "Emily R.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", rating: 5, date: "January 2026", text: "One of the best hosting experiences I've ever had. Sarah was incredibly responsive and her space exceeded all expectations. The attention to detail is remarkable." },
      { id: "r3", name: "Michael T.", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", rating: 5, date: "December 2025", text: "We booked the lakeside retreat for a team offsite and it was incredible. Sarah provided clear check-in instructions and the space had everything we needed." },
    ],
  },
  h2: {
    id: "h2",
    name: "David Chen",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    coverPhoto: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=400&fit=crop",
    location: "San Francisco, CA",
    bio: "Tech professional turned host. My spaces are designed for remote workers who need a productive, distraction-free environment. I understand what it takes to focus — high-speed internet, ergonomic setups, natural light, and great coffee. Each of my properties has been optimized for productivity without sacrificing comfort.",
    rating: 4.89,
    reviewCount: 156,
    yearsHosting: 3,
    listingCount: 2,
    responseRate: 97,
    responseTime: "within an hour",
    isSuperhost: true,
    identityVerified: true,
    languages: ["English", "Mandarin"],
    specialties: ["Workspace", "High-speed Wi-Fi", "Quiet zones"],
    joinedDate: "June 2023",
    listings: [
      { id: "l5", title: "SoMa Tech Workspace Loft", image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop", price: 65, rating: 4.92, reviewCount: 89, location: "San Francisco, CA", guests: 4 },
      { id: "l6", title: "Mission District Focus Pod", image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&h=400&fit=crop", price: 40, rating: 4.85, reviewCount: 67, location: "San Francisco, CA", guests: 1 },
    ],
    reviews: [
      { id: "r4", name: "Sophia L.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face", rating: 5, date: "March 2026", text: "David's workspace loft is a dream for remote work. Ultra-fast internet, standing desk, and the best espresso machine I've ever used in an Airbnb." },
      { id: "r5", name: "Alex K.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face", rating: 4, date: "February 2026", text: "Great space for focused work. David was helpful with recommendations for nearby lunch spots. The noise-canceling setup in the pod was impressive." },
    ],
  },
  h3: {
    id: "h3",
    name: "Maria Gonzalez",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
    coverPhoto: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=400&fit=crop",
    location: "Miami, FL",
    bio: "I offer beautiful beachside and poolside properties perfect for day relaxation. Every space is curated for a resort-like experience. Born and raised in Miami, I know the best spots and love sharing the local culture with my guests. From sunrise yoga sessions to sunset cocktail hours, my spaces are designed for ultimate relaxation.",
    rating: 4.93,
    reviewCount: 312,
    yearsHosting: 6,
    listingCount: 7,
    responseRate: 100,
    responseTime: "within minutes",
    isSuperhost: true,
    identityVerified: true,
    languages: ["English", "Spanish", "Portuguese"],
    specialties: ["Beachfront", "Pool", "Event spaces"],
    joinedDate: "January 2020",
    listings: [
      { id: "l7", title: "Oceanfront Paradise Villa", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop", price: 150, rating: 4.96, reviewCount: 98, location: "Miami Beach, FL", guests: 10 },
      { id: "l8", title: "South Beach Pool Cabana", image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&h=400&fit=crop", price: 95, rating: 4.94, reviewCount: 76, location: "Miami, FL", guests: 6 },
      { id: "l9", title: "Coral Gables Garden Terrace", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop", price: 75, rating: 4.90, reviewCount: 52, location: "Coral Gables, FL", guests: 8 },
    ],
    reviews: [
      { id: "r6", name: "Chris P.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", rating: 5, date: "March 2026", text: "Maria's beachfront villa is absolute paradise. We spent the entire day swimming, lounging, and enjoying the stunning ocean views. She even arranged a chef for our group lunch!" },
      { id: "r7", name: "Nina W.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", rating: 5, date: "January 2026", text: "Best day stay experience ever. Maria is so attentive and her space is immaculate. The pool area feels like a five-star resort." },
    ],
  },
};

const DEFAULT_HOST = {
  id: "h1",
  name: "Host",
  avatar: "",
  coverPhoto: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=400&fit=crop",
  location: "Unknown",
  bio: "No description available.",
  rating: 0,
  reviewCount: 0,
  yearsHosting: 0,
  listingCount: 0,
  responseRate: 0,
  responseTime: "N/A",
  isSuperhost: false,
  identityVerified: false,
  languages: [],
  specialties: [],
  joinedDate: "",
  listings: [],
  reviews: [],
};

const StarIcon = ({ className = "h-4 w-4" }) => (
  <svg className={`${className} fill-amber-400 text-amber-400`} viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const HostProfile = React.memo(() => {
  const { hostId } = useParams();
  const host = HOSTS_MAP[hostId] || DEFAULT_HOST;

  if (!HOSTS_MAP[hostId]) {
    return (
      <div className="py-16 text-center">
        <svg className="mx-auto h-16 w-16 text-muted/30 dark:text-dark-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <p className="mt-4 text-lg font-semibold text-ink dark:text-dark-ink">Host not found</p>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">This host profile doesn't exist.</p>
        <Link to="/hosts" className="mt-4 inline-block rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700">
          Browse all hosts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cover + avatar */}
      <div className="relative">
        <div className="h-48 overflow-hidden rounded-3xl sm:h-64">
          <img src={host.coverPhoto} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>
        <div className="absolute -bottom-12 left-6 sm:left-10">
          <div className="relative">
            <img
              src={host.avatar}
              alt={host.name}
              className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-xl dark:border-dark-panel"
            />
            {host.isSuperhost && (
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
                {host.name}
              </h1>
              {host.isSuperhost && (
                <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                  Superhost
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted dark:text-dark-muted">
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {host.location}
              </span>
              <span>Joined {host.joinedDate}</span>
            </div>
          </div>
          <button className="shrink-0 rounded-xl border border-brand-600 bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 dark:border-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500">
            Contact Host
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm dark:border-dark-border dark:bg-dark-panel">
          <div className="flex items-center justify-center gap-1">
            <StarIcon className="h-5 w-5" />
            <span className="text-2xl font-bold text-ink dark:text-dark-ink">{host.rating}</span>
          </div>
          <p className="mt-1 text-xs text-muted dark:text-dark-muted">Rating</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm dark:border-dark-border dark:bg-dark-panel">
          <p className="text-2xl font-bold text-ink dark:text-dark-ink">{host.reviewCount}</p>
          <p className="mt-1 text-xs text-muted dark:text-dark-muted">Reviews</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm dark:border-dark-border dark:bg-dark-panel">
          <p className="text-2xl font-bold text-ink dark:text-dark-ink">{host.yearsHosting}</p>
          <p className="mt-1 text-xs text-muted dark:text-dark-muted">Years hosting</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm dark:border-dark-border dark:bg-dark-panel">
          <p className="text-2xl font-bold text-ink dark:text-dark-ink">{host.listingCount}</p>
          <p className="mt-1 text-xs text-muted dark:text-dark-muted">Listings</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left column — about & details */}
        <div className="space-y-8 lg:col-span-2">
          {/* About */}
          <div>
            <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">About {host.name}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-muted dark:text-dark-muted">
              {host.bio}
            </p>
          </div>

          <hr className="border-border dark:border-dark-border" />

          {/* Specialties */}
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

          {/* Listings */}
          <div>
            <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">
              {host.name.split(" ")[0]}'s listings
            </h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {host.listings.map((listing) => (
                <Link key={listing.id} to={`/room/${listing.id}`} className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-dark-border dark:bg-dark-panel">
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={listing.image}
                      alt={listing.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-2.5 py-1 text-sm font-bold text-ink shadow backdrop-blur dark:bg-dark-panel/90 dark:text-dark-ink">
                      ${listing.price}<span className="text-xs font-normal text-muted dark:text-dark-muted"> /day</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="truncate text-sm font-semibold text-ink dark:text-dark-ink group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      {listing.title}
                    </h3>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-muted dark:text-dark-muted">
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {listing.location}
                      </span>
                      <span>{listing.guests} guest{listing.guests !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <StarIcon />
                      <span className="text-xs font-semibold text-ink dark:text-dark-ink">{listing.rating}</span>
                      <span className="text-xs text-muted dark:text-dark-muted">({listing.reviewCount})</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <hr className="border-border dark:border-dark-border" />

          {/* Reviews */}
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Guest reviews</h2>
              <div className="flex items-center gap-1">
                <StarIcon />
                <span className="text-sm font-semibold text-ink dark:text-dark-ink">{host.rating}</span>
                <span className="text-sm text-muted dark:text-dark-muted">({host.reviewCount} reviews)</span>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              {host.reviews.map((review) => (
                <div key={review.id} className="rounded-2xl border border-border bg-surface/40 p-5 dark:border-dark-border dark:bg-dark-surface/40">
                  <div className="flex items-start gap-3">
                    <img
                      src={review.avatar}
                      alt={review.name}
                      className="h-10 w-10 rounded-full object-cover"
                      loading="lazy"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink dark:text-dark-ink">{review.name}</p>
                        <div className="flex gap-0.5">
                          {Array.from({ length: review.rating }, (_, i) => (
                            <StarIcon key={i} className="h-3.5 w-3.5" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted dark:text-dark-muted">{review.date}</p>
                      <p className="mt-2 text-sm leading-relaxed text-ink/80 dark:text-dark-ink/80">{review.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Host details card */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-md dark:border-dark-border dark:bg-dark-panel">
              <h3 className="text-base font-semibold text-ink dark:text-dark-ink">Host details</h3>
              <div className="mt-4 space-y-4">
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
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                    <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink dark:text-dark-ink">Response time</p>
                    <p className="text-sm text-muted dark:text-dark-muted">Responds {host.responseTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                    <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink dark:text-dark-ink">Response rate</p>
                    <p className="text-sm text-muted dark:text-dark-muted">{host.responseRate}%</p>
                  </div>
                </div>
                {host.identityVerified && (
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
                    {host.name.split(" ")[0]} may be available for co-hosting opportunities. Reach out to discuss partnership options.
                  </p>
                  <button className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700">
                    Inquire about co-hosting
                  </button>
                </div>
              </div>
            </div>

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
