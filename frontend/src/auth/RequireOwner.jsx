import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth.js";
import { useProfile } from "./useProfile.js";
import { getImpersonation } from "../redux/api.js";

export default function RequireOwner() {
  const { session } = useAuth();
  const { isOwner, isAdmin, loading } = useProfile();
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

  // Allow access if user is an owner, OR if user is admin impersonating an owner
  const isImpersonating = isAdmin && !!getImpersonation();

  if (!isOwner && !isImpersonating) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
