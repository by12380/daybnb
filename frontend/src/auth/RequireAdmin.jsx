import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth.js";
import { useProfile } from "./useProfile.js";

export default function RequireAdmin() {
  const { session } = useAuth();
  const { isAdmin, loading, profile, error, refetch } = useProfile();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (!profile && error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-4">
        <div className="max-w-sm rounded-2xl border border-border bg-panel p-6 text-center">
          <p className="text-sm font-semibold text-ink">Couldn't verify admin access</p>
          <p className="mt-2 text-sm text-muted">
            Session was restored after idle time. Please retry.
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-medium text-ink transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    // Non-admin users trying to access admin routes get redirected to home
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
