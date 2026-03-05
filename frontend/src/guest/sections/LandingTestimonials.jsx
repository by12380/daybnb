import React, { useRef, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

const TESTIMONIALS = [
  {
    id: 1,
    quote:
      "Booked a quiet home office for the day — smooth check-in, fast Wi-Fi, and zero distractions. Exactly what I needed to crush my deadlines.",
    name: "Jordan Mitchell",
    location: "Austin, TX",
    role: "Freelance Designer",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 2,
    quote:
      "The pool day pass was amazing! Crystal-clear timing, easy checkout, and the host was super responsive. Already planning my next visit.",
    name: "Maya Rodriguez",
    location: "Miami, FL",
    role: "Marketing Manager",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 3,
    quote:
      "Found a gorgeous backyard space for my daughter's birthday. The whole process — from booking to arrival — was effortless. Highly recommend!",
    name: "David Chen",
    location: "San Francisco, CA",
    role: "Software Engineer",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 4,
    quote:
      "Used DayBnB for a team offsite. Incredible kitchen, cozy lounge, and a huge backyard. Way better than renting a conference room.",
    name: "Priya Sharma",
    location: "New York, NY",
    role: "Startup Founder",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 5,
    quote:
      "I travel a lot for work and DayBnB has been a game changer. Quiet spaces during the day without committing to an overnight stay. Love it.",
    name: "Marcus Johnson",
    location: "Chicago, IL",
    role: "Sales Director",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: 6,
    quote:
      "Hosted a yoga session in a beautiful sunlit studio I found here. The booking was seamless and the space exceeded my expectations.",
    name: "Sophie Laurent",
    location: "Los Angeles, CA",
    role: "Yoga Instructor",
    rating: 5,
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
  },
];

const StarIcon = () => (
  <svg
    className="h-4 w-4 fill-amber-400 text-amber-400"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const QuoteIcon = () => (
  <svg
    className="h-8 w-8 text-brand-400/40 dark:text-brand-500/30"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
  </svg>
);

const ArrowButton = ({ direction, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={`Scroll ${direction}`}
    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white shadow-md transition-all duration-200 dark:bg-dark-panel ${
      disabled
        ? "cursor-not-allowed opacity-40"
        : "hover:border-brand-300 hover:bg-brand-50 hover:shadow-lg active:scale-95 dark:hover:bg-brand-900/20"
    }`}
  >
    <svg
      className="h-5 w-5 text-ink dark:text-dark-ink"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  </button>
);

const TestimonialCard = React.memo(({ testimonial }) => (
  <div className="w-[320px] shrink-0 snap-start sm:w-[360px]">
    <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10 dark:bg-dark-panel dark:shadow-black/20 dark:hover:shadow-brand-500/5">
      <div className="absolute right-4 top-4">
        <QuoteIcon />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <img
            src={testimonial.avatar}
            alt={testimonial.name}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-100 ring-offset-2 dark:ring-brand-800 dark:ring-offset-dark-panel"
            loading="lazy"
          />
          <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-dark-panel">
            <svg
              className="h-3 w-3 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-ink dark:text-dark-ink">
            {testimonial.name}
          </h4>
          <p className="truncate text-xs text-muted dark:text-dark-muted">
            {testimonial.role}
          </p>
          <p className="truncate text-xs text-muted/70 dark:text-dark-muted/70">
            {testimonial.location}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-0.5">
        {Array.from({ length: testimonial.rating }, (_, i) => (
          <StarIcon key={i} />
        ))}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted dark:text-dark-muted">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
    </div>
  </div>
));

const LandingTestimonials = React.memo(() => {
  const { t } = useTranslation();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = useCallback((direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = window.innerWidth < 640 ? 336 : 376;
    el.scrollBy({ left: direction === "left" ? -cardWidth : cardWidth, behavior: "smooth" });
  }, []);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold uppercase tracking-widest text-brand-500 dark:text-brand-400">
            {t("testimonials.title")}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-ink dark:text-dark-ink sm:text-3xl">
            What our guests are saying
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted dark:text-dark-muted">
            Real experiences from people who booked day stays through our platform.
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <ArrowButton
            direction="left"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
          />
          <ArrowButton
            direction="right"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
          />
        </div>
      </div>

      <div className="relative mt-6">
        {canScrollLeft && (
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-12 bg-gradient-to-r from-surface to-transparent dark:from-dark-surface" />
        )}
        {canScrollRight && (
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-12 bg-gradient-to-l from-surface to-transparent dark:from-dark-surface" />
        )}

        <div
          ref={scrollRef}
          className="-mx-1 flex gap-5 overflow-x-auto scroll-smooth px-1 pb-4 scrollbar-hide"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {TESTIMONIALS.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>

        <div className="mt-4 flex justify-center gap-2 sm:hidden">
          <ArrowButton
            direction="left"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
          />
          <ArrowButton
            direction="right"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
          />
        </div>
      </div>
    </div>
  );
});

export default LandingTestimonials;
