import React, { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AdminPageHeader from "../components/AdminPageHeader.jsx";
import Button from "../../guest/components/ui/Button.jsx";
import HeroBannerCanvas from "../../components/HeroBannerCanvas.jsx";
import {
  deleteAdminHeroBanner,
  fetchAdminHeroBanners,
  updateAdminHeroBanner,
} from "../../redux/slices/heroBannerSlice.js";

function statusBadge(isActive) {
  return isActive
    ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

export default function AdminHeroBanners() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { adminBanners, loading } = useSelector((state) => state.heroBanners);

  useEffect(() => {
    dispatch(fetchAdminHeroBanners());
  }, [dispatch]);

  const sortedBanners = useMemo(
    () =>
      [...(adminBanners || [])].sort((a, b) => {
        if ((a.sort_order || 0) !== (b.sort_order || 0)) {
          return (a.sort_order || 0) - (b.sort_order || 0);
        }
        return String(b.created_at || "").localeCompare(String(a.created_at || ""));
      }),
    [adminBanners]
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("Delete this hero banner?")) return;
      await dispatch(deleteAdminHeroBanner(id));
      dispatch(fetchAdminHeroBanners());
    },
    [dispatch]
  );

  const handleToggleActive = useCallback(
    async (banner) => {
      await dispatch(
        updateAdminHeroBanner({
          id: banner.id,
          is_active: !banner.is_active,
        })
      );
      dispatch(fetchAdminHeroBanners());
    },
    [dispatch]
  );

  if (loading && (!adminBanners || adminBanners.length === 0)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading hero banners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Hero Banners"
        subtitle="Manage the landing page slider with responsive text placement and live preview."
        actions={(
          <Button onClick={() => navigate("/admin/hero-banners/new")}>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Create Banner
          </Button>
        )}
      />

      {sortedBanners.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel py-12 text-center shadow-sm">
          <svg
            className="mx-auto h-12 w-12 text-muted/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2 1.586-1.586a2 2 0 012.828 0L20 14m-6-8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-ink">No hero banners yet</p>
          <p className="mt-1 text-sm text-muted">
            If you leave this empty, the current landing hero stays exactly as it is.
          </p>
          <div className="mt-4">
            <Button onClick={() => navigate("/admin/hero-banners/new")}>Create Banner</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {sortedBanners.map((banner) => (
            <div
              key={banner.id}
              className="overflow-hidden rounded-3xl border border-border bg-panel shadow-sm"
            >
              <div className="p-4">
                <HeroBannerCanvas
                  banner={banner}
                  preview
                  className="min-h-[240px] sm:min-h-[280px]"
                />
              </div>
              <div className="border-t border-border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-ink">{banner.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(
                          banner.is_active
                        )}`}
                      >
                        {banner.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      Sort order: {banner.sort_order || 0} | Desktop pos:{" "}
                      {Math.round(Number(banner.box_x_desktop || 0))}% /{" "}
                      {Math.round(Number(banner.box_y_desktop || 0))}%
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate(`/admin/hero-banners/${banner.id}/edit`)}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(banner)}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600"
                    >
                      {banner.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
