import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import { useNavigate } from "react-router-dom";
import Button from "../../guest/components/ui/Button.jsx";
import { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import api, { setImpersonation, clearImpersonation, getImpersonation } from "../../redux/api.js";

export default function AdminOwners() {
  const navigate = useNavigate();

  const [owners, setOwners] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [impersonating, setImpersonating] = useState(getImpersonation());
  const [impersonatedOwner, setImpersonatedOwner] = useState(null);
  const [confirmImpersonate, setConfirmImpersonate] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/owners", {
        params: { search: searchTerm || undefined, limit: 100 },
      });
      setOwners(data.owners || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [searchTerm]);

  useEffect(() => { fetchOwners(); }, [fetchOwners]);

  const handleStartImpersonation = useCallback(async (owner) => {
    setActionLoading(true);
    setError("");
    try {
      const { data } = await api.post(`/admin/impersonate/${owner.id}`);
      setImpersonation(owner.id);
      setImpersonating(owner.id);
      setImpersonatedOwner(data.owner);
      setConfirmImpersonate(null);
    } catch (err) {
      setError(err.message);
    }
    setActionLoading(false);
  }, []);

  const handleStopImpersonation = useCallback(async () => {
    setActionLoading(true);
    try {
      await api.post("/admin/stop-impersonate");
    } catch {
      // ignore
    }
    clearImpersonation();
    setImpersonating(null);
    setImpersonatedOwner(null);
    setActionLoading(false);
  }, []);

  const handleViewAsOwner = useCallback(() => {
    navigate("/owner");
  }, [navigate]);

  const filteredOwners = useMemo(() => {
    return owners;
  }, [owners]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading owners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Impersonation Banner */}
      {impersonating && (
        <div className="flex items-center justify-between rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 text-amber-700 dark:bg-amber-800 dark:text-amber-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                Impersonating: {impersonatedOwner?.full_name || impersonatedOwner?.email || "Owner"}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                API calls will act on behalf of this owner. You can view their panel or stop impersonation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleViewAsOwner} disabled={actionLoading}>
              View Owner Panel
            </Button>
            <button
              onClick={handleStopImpersonation}
              disabled={actionLoading}
              className="rounded-lg border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-800/50 dark:text-amber-200 dark:hover:bg-amber-700/50"
            >
              {actionLoading ? "Stopping..." : "Stop Impersonation"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Owners</h1>
          <p className="mt-1 text-sm text-muted">Manage property owner accounts ({total} total)</p>
        </div>
      </div>

      <div className="flex-1">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`${INPUT_STYLES} w-full max-w-md`}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {filteredOwners.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel py-12 text-center shadow-sm">
          <p className="text-sm font-medium text-ink">No owners found</p>
          <p className="mt-1 text-sm text-muted">{searchTerm ? "Try adjusting your search" : "Owner accounts will appear here when users register as owners"}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOwners.map((owner) => {
            const isCurrentlyImpersonating = impersonating === owner.id;
            return (
              <div key={owner.id} className={`rounded-2xl border bg-panel p-5 shadow-sm transition-shadow hover:shadow-md ${isCurrentlyImpersonating ? "border-amber-300 ring-2 ring-amber-200 dark:border-amber-600 dark:ring-amber-800" : "border-border"}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {(owner.full_name || owner.email || "O").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{owner.full_name || "No name"}</p>
                      <p className="truncate text-sm text-muted">{owner.email}</p>
                    </div>
                  </div>
                  {isCurrentlyImpersonating && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Active
                    </span>
                  )}
                </div>
                {owner.phone && <p className="mt-3 text-sm text-muted">{owner.phone}</p>}
                {owner.created_at && (
                  <p className="mt-1 text-xs text-muted">
                    Joined {new Date(owner.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  {isCurrentlyImpersonating ? (
                    <>
                      <button
                        onClick={handleViewAsOwner}
                        className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      >
                        View Panel
                      </button>
                      <button
                        onClick={handleStopImpersonation}
                        className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      >
                        Stop
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmImpersonate(owner)}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Impersonate
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Impersonation Modal */}
      <Modal
        title="Start Impersonation"
        open={!!confirmImpersonate}
        onCancel={() => setConfirmImpersonate(null)}
        footer={null}
        destroyOnClose
      >
        <div className="space-y-4 pt-4">
          <p className="text-sm text-muted">
            You are about to impersonate this owner. While impersonating, API calls through the owner panel will act on behalf of their account.
          </p>
          {confirmImpersonate && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-200 text-lg font-bold text-amber-700 dark:bg-amber-800 dark:text-amber-300">
                {(confirmImpersonate.full_name || confirmImpersonate.email || "O").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-ink">{confirmImpersonate.full_name || "No name"}</p>
                <p className="text-sm text-muted">{confirmImpersonate.email}</p>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/30">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              You can stop impersonation at any time from this page or by navigating back to the admin panel.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setConfirmImpersonate(null)}>Cancel</Button>
            <Button
              className="!bg-amber-600 hover:!bg-amber-700"
              onClick={() => handleStartImpersonation(confirmImpersonate)}
              disabled={actionLoading}
            >
              {actionLoading ? "Starting..." : "Start Impersonation"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
