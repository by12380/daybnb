import React, { useState, useCallback } from "react";
import api from "../../redux/api.js";
import {
  configureAlgoliaBookingsIndex,
  fullSyncBookingsToAlgolia,
} from "../../lib/algoliaSync.js";

function StatusBadge({ status }) {
  const styles = {
    idle: "bg-surface/60 text-muted",
    running: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    success: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    error: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  const labels = { idle: "Idle", running: "Running...", success: "Success", error: "Failed" };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {status === "running" && (
        <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {labels[status]}
    </span>
  );
}

function LogEntry({ entry }) {
  const color = entry.type === "error"
    ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20"
    : "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20";

  return (
    <div className={`rounded-lg border p-3 text-xs ${color}`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink dark:text-dark-ink">{entry.action}</span>
        <span className="text-muted dark:text-dark-muted">{entry.time}</span>
      </div>
      {entry.message && <p className="mt-1 text-muted dark:text-dark-muted">{entry.message}</p>}
      {entry.detail && (
        <pre className="mt-2 max-h-40 overflow-auto rounded bg-surface/60 p-2 text-[11px] text-ink dark:bg-dark-surface/60 dark:text-dark-ink">
          {typeof entry.detail === "string" ? entry.detail : JSON.stringify(entry.detail, null, 2)}
        </pre>
      )}
    </div>
  );
}

const EXPECTED_FIELDS = [
  "objectID", "title", "location", "guests", "type", "image", "tags",
  "price_per_day", "description", "booked_dates", "property_type",
  "place_type", "bedrooms", "beds", "bathrooms", "instant_book",
  "self_checkin", "allows_pets", "is_guest_favorite", "is_luxe",
  "amenities", "safety_features", "_geoloc", "created_at",
];

export default function AlgoliaSync() {
  const [configStatus, setConfigStatus] = useState("idle");
  const [syncStatus, setSyncStatus] = useState("idle");
  const [bookingConfigStatus, setBookingConfigStatus] = useState("idle");
  const [bookingSyncStatus, setBookingSyncStatus] = useState("idle");
  const [logs, setLogs] = useState([]);

  const addLog = useCallback((action, type, message, detail) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ action, type, message, detail, time }, ...prev]);
  }, []);

  const handleConfigureIndex = useCallback(async () => {
    setConfigStatus("running");
    try {
      const { data } = await api.post("/admin/algolia/configure");
      setConfigStatus("success");
      addLog("Configure Index", "success", "Index settings updated with all filterable attributes.", data);
    } catch (err) {
      setConfigStatus("error");
      addLog("Configure Index", "error", err.message || err.error || "Failed to configure index");
    }
  }, [addLog]);

  const handleFullSync = useCallback(async () => {
    setSyncStatus("running");
    try {
      const { data } = await api.post("/admin/algolia/full-sync");
      setSyncStatus("success");
      const count = data?.roomsCount ?? "?";
      addLog("Full Sync", "success", `${count} rooms synced to Algolia with all fields.`, data);
    } catch (err) {
      setSyncStatus("error");
      addLog("Full Sync", "error", err.message || err.error || "Failed to sync");
    }
  }, [addLog]);

  const handleConfigureBookings = useCallback(async () => {
    setBookingConfigStatus("running");
    try {
      const result = await configureAlgoliaBookingsIndex();
      setBookingConfigStatus("success");
      addLog("Configure Bookings Index", "success", "Bookings index settings updated.", result);
    } catch (err) {
      setBookingConfigStatus("error");
      addLog("Configure Bookings Index", "error", err.message);
    }
  }, [addLog]);

  const handleFullBookingSync = useCallback(async () => {
    setBookingSyncStatus("running");
    try {
      const result = await fullSyncBookingsToAlgolia();
      setBookingSyncStatus("success");
      addLog("Full Bookings Sync", "success", "All bookings synced.", result);
    } catch (err) {
      setBookingSyncStatus("error");
      addLog("Full Bookings Sync", "error", err.message);
    }
  }, [addLog]);

  const handleRunBoth = useCallback(async () => {
    setConfigStatus("running");
    setSyncStatus("running");
    try {
      const { data: configResult } = await api.post("/admin/algolia/configure");
      setConfigStatus("success");
      addLog("Configure Index", "success", "Index settings updated.", configResult);
    } catch (err) {
      setConfigStatus("error");
      addLog("Configure Index", "error", err.message || "Failed to configure");
      setSyncStatus("idle");
      return;
    }
    try {
      const { data: syncResult } = await api.post("/admin/algolia/full-sync");
      setSyncStatus("success");
      const count = syncResult?.roomsCount ?? "?";
      addLog("Full Sync", "success", `${count} rooms synced with all fields.`, syncResult);
    } catch (err) {
      setSyncStatus("error");
      addLog("Full Sync", "error", err.message || "Failed to sync");
    }
  }, [addLog]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink dark:text-dark-ink">Algolia Sync</h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Manage search index configuration and data synchronization.
        </p>
      </div>

      {/* Expected fields reference */}
      <div className="rounded-2xl border border-border bg-panel p-5 dark:border-dark-border dark:bg-dark-panel">
        <h2 className="text-sm font-semibold text-ink dark:text-dark-ink">Expected Algolia Fields</h2>
        <p className="mt-1 text-xs text-muted dark:text-dark-muted">
          After a full sync, each Algolia record should contain these fields:
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXPECTED_FIELDS.map((f) => (
            <span key={f} className="rounded-full border border-border bg-surface/60 px-2 py-0.5 text-[11px] font-mono text-ink dark:border-dark-border dark:bg-dark-surface/60 dark:text-dark-ink">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Rooms Index */}
      <div className="rounded-2xl border border-border bg-panel p-5 dark:border-dark-border dark:bg-dark-panel">
        <h2 className="mb-4 text-lg font-semibold text-ink dark:text-dark-ink">Rooms Index</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <button
            onClick={handleConfigureIndex}
            disabled={configStatus === "running"}
            className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50 dark:border-dark-border dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
          >
            <svg className="h-8 w-8 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-ink dark:text-dark-ink">Configure Index</span>
            <span className="text-[11px] text-muted dark:text-dark-muted">Update searchable &amp; filterable attributes</span>
            <StatusBadge status={configStatus} />
          </button>

          <button
            onClick={handleFullSync}
            disabled={syncStatus === "running"}
            className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50 dark:border-dark-border dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
          >
            <svg className="h-8 w-8 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-medium text-ink dark:text-dark-ink">Full Sync</span>
            <span className="text-[11px] text-muted dark:text-dark-muted">Re-push all rooms with all fields</span>
            <StatusBadge status={syncStatus} />
          </button>

          <button
            onClick={handleRunBoth}
            disabled={configStatus === "running" || syncStatus === "running"}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-brand-300 bg-brand-50/50 p-4 transition hover:bg-brand-50 disabled:opacity-50 dark:border-brand-600 dark:bg-brand-900/10 dark:hover:bg-brand-900/20"
          >
            <svg className="h-8 w-8 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium text-ink dark:text-dark-ink">Configure + Sync</span>
            <span className="text-[11px] text-muted dark:text-dark-muted">Run both in sequence (recommended)</span>
            <StatusBadge status={configStatus === "running" || syncStatus === "running" ? "running" : configStatus === "error" || syncStatus === "error" ? "error" : configStatus === "success" && syncStatus === "success" ? "success" : "idle"} />
          </button>
        </div>
      </div>

      {/* Bookings Index */}
      <div className="rounded-2xl border border-border bg-panel p-5 dark:border-dark-border dark:bg-dark-panel">
        <h2 className="mb-4 text-lg font-semibold text-ink dark:text-dark-ink">Bookings Index</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={handleConfigureBookings}
            disabled={bookingConfigStatus === "running"}
            className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50 dark:border-dark-border dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
          >
            <svg className="h-8 w-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-ink dark:text-dark-ink">Configure Bookings</span>
            <StatusBadge status={bookingConfigStatus} />
          </button>

          <button
            onClick={handleFullBookingSync}
            disabled={bookingSyncStatus === "running"}
            className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50 dark:border-dark-border dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
          >
            <svg className="h-8 w-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-medium text-ink dark:text-dark-ink">Full Bookings Sync</span>
            <StatusBadge status={bookingSyncStatus} />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="rounded-2xl border border-border bg-panel p-5 dark:border-dark-border dark:bg-dark-panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink dark:text-dark-ink">Activity Log</h2>
          {logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              className="text-xs text-muted hover:text-ink dark:text-dark-muted dark:hover:text-dark-ink"
            >
              Clear
            </button>
          )}
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-muted dark:text-dark-muted">No activity yet. Run an action above.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((entry, i) => (
              <LogEntry key={i} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
