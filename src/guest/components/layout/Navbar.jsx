import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth.js";
import Button from "../ui/Button.jsx";

export default function GuestNavbar() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  }, [signOut, navigate]);

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
          <button className="rounded-full px-3 py-1.5 hover:text-brand-600">
            Browse
          </button>
          <button className="rounded-full px-3 py-1.5 hover:text-brand-600">
            How it works
          </button>
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          ) : user ? (
            <>
              <span className="max-w-[150px] truncate text-xs text-muted">
                {user.email}
              </span>
              <Button variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
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
