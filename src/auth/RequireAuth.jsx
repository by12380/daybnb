import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth.js";

export default function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-panel p-6 text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (!session) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <Outlet />;
}

