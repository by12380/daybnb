import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth.js";
import { useProfile } from "../../../auth/useProfile.js";
import Button from "../ui/Button.jsx";
import UserNotificationDropdown from "../NotificationDropdown.jsx";
import ThemeToggle from "../../../theme/ThemeToggle.jsx";

export default function GuestNavbar() {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useProfile();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleSignOut = useCallback(async () => {
    try {
      setDropdownOpen(false);
      await signOut();
      navigate("/");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  }, [signOut, navigate]);

  const toggleDropdown = useCallback(() => {
    setDropdownOpen((prev) => !prev);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userInitial = user?.email?.[0]?.toUpperCase() || "U";
  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-panel/80 backdrop-blur transition-colors duration-300">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-wide text-gradient dark:text-gradient-dark">
            Daybnb
          </span>
          <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            Day-Use Only
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm text-muted dark:text-dark-muted">
          <Link to="/" className="rounded-full px-3 py-1.5 hover:text-brand-600 dark:hover:text-brand-400">
            Browse
          </Link>
          <a href="#how-it-works" className="rounded-full px-3 py-1.5 hover:text-brand-600 dark:hover:text-brand-400">
            How it works
          </a>
          <ThemeToggle />
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 dark:border-brand-700 dark:border-t-brand-400" />
          ) : user ? (
            <>
            <UserNotificationDropdown />
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className="flex items-center gap-2 rounded-full border border-border bg-panel px-2 py-1.5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-semibold text-white">
                  {userInitial}
                </div>
                <svg
                  className={`h-4 w-4 text-muted transition-transform dark:text-dark-muted ${dropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-border bg-panel py-2 shadow-xl">
                  <div className="border-b border-border px-4 pb-3 pt-2">
                    <p className="truncate text-sm font-semibold text-ink">{userName}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink transition hover:bg-surface/60"
                    >
                      <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Profile
                    </Link>
                    <Link
                      to="/my-bookings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink transition hover:bg-surface/60"
                    >
                      <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      My Bookings
                    </Link>
                    <Link
                      to="/liked-rooms"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink transition hover:bg-surface/60"
                    >
                      <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M11.995 21s-7.5-4.35-9.77-8.78C.71 9.29 2.02 6.4 4.86 5.57c1.64-.48 3.41.02 4.65 1.27l2.49 2.52 2.49-2.52c1.24-1.25 3.01-1.75 4.65-1.27 2.84.83 4.15 3.72 2.63 6.65C19.495 16.65 11.995 21 11.995 21z"
                        />
                      </svg>
                      Liked Rooms
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink transition hover:bg-surface/60"
                      >
                        <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2a4 4 0 014-4h2m-6 6h6m2 0a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2h2" />
                        </svg>
                        Admin Panel
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-border pt-1">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="outline">Sign in</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
