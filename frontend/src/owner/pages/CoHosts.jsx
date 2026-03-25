import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCoHosts, fetchCoHostInvites, inviteCoHost,
  respondToCoHostInvite, updateCoHostPermissions, removeCoHost,
} from "../../redux/slices/ownerSlice.js";

const ALL_PERMISSIONS = [
  { key: "view_bookings", label: "View Bookings" },
  { key: "manage_bookings", label: "Manage Bookings" },
  { key: "view_rooms", label: "View Rooms" },
  { key: "manage_rooms", label: "Manage Rooms" },
  { key: "view_customers", label: "View Customers" },
  { key: "manage_checkin", label: "Manage Check-in/out" },
];

const PermissionsEditor = React.memo(({ coHost, onSave }) => {
  const [perms, setPerms] = useState(coHost.permissions || []);
  const [saving, setSaving] = useState(false);

  const toggle = (key) => {
    setPerms((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(coHost.id, perms);
    setSaving(false);
  };

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface/40 p-3 dark:border-dark-border dark:bg-dark-surface/40">
      <p className="text-xs font-semibold text-muted dark:text-dark-muted">Permissions</p>
      <div className="grid grid-cols-2 gap-2">
        {ALL_PERMISSIONS.map(({ key, label }) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 text-xs text-ink dark:text-dark-ink">
            <input type="checkbox" checked={perms.includes(key)} onChange={() => toggle(key)} className="rounded border-border text-brand-600 focus:ring-brand-500" />
            {label}
          </label>
        ))}
      </div>
      <button onClick={handleSave} disabled={saving} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50">
        {saving ? "Saving..." : "Update Permissions"}
      </button>
    </div>
  );
});

export default function CoHosts() {
  const dispatch = useDispatch();
  const { coHosts, coHostInvites, coHostLoading, error } = useSelector((s) => s.owner);

  const [tab, setTab] = useState("my-cohosts");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    dispatch(fetchCoHosts());
    dispatch(fetchCoHostInvites());
  }, [dispatch]);

  const handleInvite = useCallback(async (e) => {
    e.preventDefault();
    setInviteError(""); setInviteSuccess("");
    if (!inviteEmail.trim()) return;
    try {
      await dispatch(inviteCoHost({ email: inviteEmail.trim() })).unwrap();
      setInviteSuccess("Co-host invitation sent!");
      setInviteEmail("");
    } catch (err) {
      setInviteError(typeof err === "string" ? err : "Failed to send invitation.");
    }
  }, [dispatch, inviteEmail]);

  const handleRespond = useCallback(async (id, action) => {
    try {
      await dispatch(respondToCoHostInvite({ id, action })).unwrap();
    } catch {
      // handled by slice
    }
  }, [dispatch]);

  const handleUpdatePermissions = useCallback(async (id, permissions) => {
    try {
      await dispatch(updateCoHostPermissions({ id, permissions })).unwrap();
    } catch {
      // handled by slice
    }
  }, [dispatch]);

  const handleRemove = useCallback(async (id) => {
    if (!window.confirm("Remove this co-host?")) return;
    try {
      await dispatch(removeCoHost(id)).unwrap();
    } catch {
      // handled by slice
    }
  }, [dispatch]);

  const pendingInvites = coHostInvites.filter((i) => i.status === "pending");
  const acceptedCoHosts = coHosts.filter((c) => c.status === "accepted");
  const pendingCoHosts = coHosts.filter((c) => c.status === "pending");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-dark-ink">Co-hosts</h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Manage your co-hosting relationships. Invite other owners to help manage your properties.
        </p>
      </div>

      {/* Invite Form */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-panel">
        <h2 className="text-base font-semibold text-ink dark:text-dark-ink">Invite a Co-host</h2>
        <p className="mt-1 text-xs text-muted dark:text-dark-muted">The co-host must have an existing owner account on Daybnb.</p>
        <form onSubmit={handleInvite} className="mt-4 flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); setInviteSuccess(""); }}
            placeholder="cohost@example.com"
            className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-dark-border dark:bg-dark-panel dark:text-dark-ink dark:focus:border-brand-600 dark:focus:ring-brand-800"
          />
          <button type="submit" className="shrink-0 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700">
            Send Invite
          </button>
        </form>
        {inviteError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{inviteError}</p>}
        {inviteSuccess && <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{inviteSuccess}</p>}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-px dark:border-dark-border">
        {[
          { key: "my-cohosts", label: "My Co-hosts", count: acceptedCoHosts.length },
          { key: "pending-sent", label: "Pending Sent", count: pendingCoHosts.length },
          { key: "invites", label: "Received Invites", count: pendingInvites.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key
                ? "border-b-2 border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "text-muted hover:text-ink dark:text-dark-muted dark:hover:text-dark-ink"
            }`}
          >
            {label}
            {count > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {coHostLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        </div>
      ) : (
        <>
          {/* My Co-hosts */}
          {tab === "my-cohosts" && (
            <div className="space-y-4">
              {acceptedCoHosts.length === 0 ? (
                <div className="rounded-2xl border border-border bg-white py-12 text-center shadow-sm dark:border-dark-border dark:bg-dark-panel">
                  <svg className="mx-auto h-12 w-12 text-muted/30 dark:text-dark-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="mt-4 text-sm font-medium text-ink dark:text-dark-ink">No co-hosts yet</p>
                  <p className="mt-1 text-xs text-muted dark:text-dark-muted">Invite owners to help manage your properties.</p>
                </div>
              ) : (
                acceptedCoHosts.map((ch) => (
                  <div key={ch.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-panel">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                          {ch.co_host_profile?.avatar_url ? (
                            <img src={ch.co_host_profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                          ) : (
                            (ch.co_host_profile?.full_name || ch.co_host_profile?.email || "C").charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-ink dark:text-dark-ink">
                            {ch.co_host_profile?.full_name || "Co-host"}
                            {ch.co_host_profile?.is_superhost && (
                              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Superhost</span>
                            )}
                          </p>
                          <p className="text-sm text-muted dark:text-dark-muted">{ch.co_host_profile?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedId(expandedId === ch.id ? null : ch.id)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-dark-border dark:text-dark-muted"
                        >
                          {expandedId === ch.id ? "Hide" : "Permissions"}
                        </button>
                        <button
                          onClick={() => handleRemove(ch.id)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-dark-border dark:text-dark-muted"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {expandedId === ch.id && (
                      <PermissionsEditor coHost={ch} onSave={handleUpdatePermissions} />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pending Sent */}
          {tab === "pending-sent" && (
            <div className="space-y-4">
              {pendingCoHosts.length === 0 ? (
                <div className="rounded-2xl border border-border bg-white py-12 text-center shadow-sm dark:border-dark-border dark:bg-dark-panel">
                  <p className="text-sm font-medium text-ink dark:text-dark-ink">No pending invitations</p>
                </div>
              ) : (
                pendingCoHosts.map((ch) => (
                  <div key={ch.id} className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-700 dark:bg-amber-900/10">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                        {(ch.co_host_profile?.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-ink dark:text-dark-ink">{ch.co_host_profile?.full_name || ch.co_host_profile?.email || "Invited"}</p>
                        <p className="text-xs text-muted dark:text-dark-muted">Pending since {new Date(ch.invited_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Pending</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Received Invites */}
          {tab === "invites" && (
            <div className="space-y-4">
              {pendingInvites.length === 0 ? (
                <div className="rounded-2xl border border-border bg-white py-12 text-center shadow-sm dark:border-dark-border dark:bg-dark-panel">
                  <p className="text-sm font-medium text-ink dark:text-dark-ink">No pending invitations</p>
                </div>
              ) : (
                pendingInvites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-2xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-700 dark:bg-brand-900/10">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                        {(inv.owner_profile?.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-ink dark:text-dark-ink">{inv.owner_profile?.full_name || "A host"}</p>
                        <p className="text-xs text-muted dark:text-dark-muted">wants you to co-host their properties</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRespond(inv.id, "accept")} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700">Accept</button>
                      <button onClick={() => handleRespond(inv.id, "reject")} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-dark-border dark:text-dark-muted">Decline</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
