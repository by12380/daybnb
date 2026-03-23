import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import SearchField from "../../components/ui/SearchField.jsx";
import Button from "../../components/ui/Button.jsx";
import FormInput, { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import api, { setImpersonation, clearImpersonation, getImpersonation } from "../../redux/api.js";

/* ── View Owner Modal ────────────────────────────────────── */
const ViewOwnerModal = React.memo(({ open, owner, onClose }) => {
  if (!owner) return null;

  return (
    <Modal title="Owner Details" open={open} onCancel={onClose} footer={<Button variant="outline" onClick={onClose}>Close</Button>} destroyOnClose width={500}>
      <div className="space-y-6 pt-4">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            {(owner.full_name || owner.email || "O").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-ink">{owner.full_name || "No name"}</h3>
            <p className="text-sm text-muted">{owner.email}</p>
            {owner.phone && <p className="text-sm text-muted">{owner.phone}</p>}
          </div>
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-surface/60 p-4">
          <h4 className="font-medium text-ink">Account Information</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Role</span><span className="font-medium text-emerald-600 capitalize">Owner</span></div>
            <div className="flex justify-between"><span className="text-muted">User ID</span><span className="font-mono text-xs text-ink">{owner.id}</span></div>
            {owner.created_at && (
              <div className="flex justify-between">
                <span className="text-muted">Joined</span>
                <span className="text-ink">{new Date(owner.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
            )}
            {owner.updated_at && (
              <div className="flex justify-between">
                <span className="text-muted">Last Updated</span>
                <span className="text-ink">{new Date(owner.updated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
});

/* ── Edit Owner Modal ────────────────────────────────────── */
const EditOwnerModal = React.memo(({ open, owner, onClose, onSave }) => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (owner && open) {
      setFullName(owner.full_name || "");
      setPhone(owner.phone || "");
      setEmail(owner.email || "");
      setError("");
    }
  }, [owner, open]);

  const handleSave = useCallback(async () => {
    setError(""); setSaving(true);
    try {
      const { data } = await api.put(`/admin/owners/${owner.id}`, {
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      onSave(data.owner);
    } catch (err) {
      setError(err.message || "Failed to update owner.");
    }
    setSaving(false);
  }, [owner?.id, fullName, phone, email, onSave]);

  return (
    <Modal title="Edit Owner" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            {(owner?.full_name || owner?.email || "O").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-ink">{owner?.email}</p>
            <p className="text-xs text-muted">User ID: {owner?.id?.slice(0, 8)}...</p>
          </div>
        </div>
        <FormInput label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter full name" />
        <FormInput label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@example.com" />
        <FormInput label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </div>
    </Modal>
  );
});

/* ── Delete Owner Modal ────────────────────────────────────── */
const DeleteOwnerModal = React.memo(({ open, owner, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = useCallback(async () => {
    setError(""); setDeleting(true);
    try {
      await api.delete(`/admin/owners/${owner.id}`);
      onConfirm(owner.id);
    } catch (err) {
      setError(err.message || "Failed to delete owner.");
    }
    setDeleting(false);
  }, [owner?.id, onConfirm]);

  return (
    <Modal title="Delete Owner Account" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted">Are you sure you want to delete this owner account? This action cannot be undone and will remove the owner's profile.</p>
        {owner && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
            <p className="font-medium text-ink">{owner.full_name || "No name"}</p>
            <p className="text-sm text-muted">{owner.email}</p>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="!bg-red-600 hover:!bg-red-700" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete Owner"}</Button>
        </div>
      </div>
    </Modal>
  );
});

/* ── Main Component ────────────────────────────────────── */
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

  // Modal states
  const [viewingOwner, setViewingOwner] = useState(null);
  const [editingOwner, setEditingOwner] = useState(null);
  const [deletingOwner, setDeletingOwner] = useState(null);

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

  // Restore impersonated owner info from backend when session is recovered
  useEffect(() => {
    if (impersonating && !impersonatedOwner) {
      api.get(`/admin/owners/${impersonating}`)
        .then(({ data }) => setImpersonatedOwner(data.owner || null))
        .catch(() => {});
    }
  }, [impersonating, impersonatedOwner]);

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

  const handleEditSave = useCallback((updatedOwner) => {
    setEditingOwner(null);
    setOwners((prev) => prev.map((o) => (o.id === updatedOwner.id ? updatedOwner : o)));
  }, []);

  const handleDeleteConfirm = useCallback((deletedId) => {
    setDeletingOwner(null);
    setOwners((prev) => prev.filter((o) => o.id !== deletedId));
    setTotal((prev) => prev - 1);
    // If we were impersonating this owner, stop
    if (impersonating === deletedId) {
      clearImpersonation();
      setImpersonating(null);
      setImpersonatedOwner(null);
    }
  }, [impersonating]);

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

      <PageHeader
        title="Owners"
        subtitle={`Manage property owner accounts (${total} total)`}
      />

      <SearchField
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onClear={() => setSearchTerm("")}
        placeholder="Search by name or email..."
        className="flex-1"
        inputClassName="max-w-md"
      />

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

                {/* Action buttons */}
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
                    <>
                      <button
                        onClick={() => setViewingOwner(owner)}
                        className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
                      >
                        View
                      </button>
                      <button
                        onClick={() => setEditingOwner(owner)}
                        className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingOwner(owner)}
                        className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <button
                        onClick={() => setConfirmImpersonate(owner)}
                        className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                        title="Impersonate"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </>
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

      {/* View / Edit / Delete Modals */}
      <ViewOwnerModal open={!!viewingOwner} owner={viewingOwner} onClose={() => setViewingOwner(null)} />
      <EditOwnerModal open={!!editingOwner} owner={editingOwner} onClose={() => setEditingOwner(null)} onSave={handleEditSave} />
      <DeleteOwnerModal open={!!deletingOwner} owner={deletingOwner} onClose={() => setDeletingOwner(null)} onConfirm={handleDeleteConfirm} />
    </div>
  );
}
