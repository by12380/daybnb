import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth.js";
import Button from "../ui/Button.jsx";

export default function GuestNavbar() {
  const { user, loading, signOut } = useAuth();
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
    <header className="sticky top-0 z-20 border-b border-border bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-wide text-ink">
            Daybnb
          </span>
          <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
            Day-Use Only
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm text-muted">
          <Link to="/" className="rounded-full px-3 py-1.5 hover:text-brand-600">
            Browse
          </Link>
          <a href="#how-it-works" className="rounded-full px-3 py-1.5 hover:text-brand-600">
            How it works
          </a>
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className="flex items-center gap-2 rounded-full border border-border bg-white px-2 py-1.5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-semibold text-white">
                  {userInitial}
                </div>
                <svg
                  className={`h-4 w-4 text-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-border bg-white py-2 shadow-xl">
                  <div className="border-b border-border px-4 pb-3 pt-2">
                    <p className="truncate text-sm font-semibold text-ink">{userName}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink transition hover:bg-slate-50"
                    >
                      <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Profile
                    </Link>
                    <Link
                      to="/my-bookings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink transition hover:bg-slate-50"
                    >
                      <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      My Bookings
                    </Link>
                  </div>

                  <div className="border-t border-border pt-1">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
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
