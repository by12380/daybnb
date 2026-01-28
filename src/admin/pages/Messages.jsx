import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import { supabase } from "../../lib/supabaseClient.js";
import Button from "../../guest/components/ui/Button.jsx";
import { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";

const TABLE = "contact_messages";

function formatDateTime(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function statusBadge(status) {
  const s = String(status || "new").toLowerCase();
  if (s === "read") return "bg-surface/60 text-muted";
  return "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
}

const ViewMessageModal = React.memo(
  ({ open, message, onClose, onMarkRead, onMarkUnread }) => {
    if (!message) return null;

    const isRead = String(message.status || "new").toLowerCase() === "read";

    return (
      <Modal
        title="Message Details"
        open={open}
        onCancel={onClose}
        footer={
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted">
              ID: <span className="font-mono">{message.id}</span>
            </div>
            <div className="flex gap-2">
              {isRead ? (
                <Button variant="outline" onClick={() => onMarkUnread(message)}>
                  Mark as new
                </Button>
              ) : (
                <Button variant="outline" onClick={() => onMarkRead(message)}>
                  Mark as read
                </Button>
              )}
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        }
        destroyOnClose
        width={720}
      >
        <div className="space-y-5 pt-4">
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">{message.name}</p>
                <p className="text-xs text-muted">
                  {message.email} • {message.mobile}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(
                  message.status
                )}`}
              >
                {String(message.status || "new")}
              </span>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted">City</p>
                <p className="mt-1 text-ink">{message.city || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted">Received</p>
                <p className="mt-1 text-ink">{formatDateTime(message.created_at)}</p>
              </div>
              {message.read_at && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted">Read at</p>
                  <p className="mt-1 text-ink">{formatDateTime(message.read_at)}</p>
                </div>
              )}
              {message.page_url && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted">Page</p>
                  <p className="mt-1 break-words text-ink">{message.page_url}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted">Message</p>
            <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-border bg-panel p-4 text-sm text-ink">
              {message.message}
            </div>
          </div>
        </div>
      </Modal>
    );
  }
);

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | new | read
  const [viewing, setViewing] = useState(null);

  const fetchMessages = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message || "Failed to load messages.");
      setMessages([]);
      setLoading(false);
      return;
    }

    setMessages(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const counts = useMemo(() => {
    const total = messages.length;
    const unread = messages.filter(
      (m) => String(m.status || "new").toLowerCase() !== "read"
    ).length;
    return { total, unread };
  }, [messages]);

  const filtered = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return messages.filter((m) => {
      const status = String(m.status || "new").toLowerCase();
      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (search) {
        const hay = [m.name, m.email, m.mobile, m.city, m.message, m.id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(search)) return false;
      }

      return true;
    });
  }, [messages, searchTerm, statusFilter]);

  const markRead = useCallback(
    async (msg) => {
      if (!supabase || !msg?.id) return;
      await supabase
        .from(TABLE)
        .update({ status: "read", read_at: new Date().toISOString() })
        .eq("id", msg.id);
      fetchMessages();
    },
    [fetchMessages]
  );

  const markUnread = useCallback(
    async (msg) => {
      if (!supabase || !msg?.id) return;
      await supabase
        .from(TABLE)
        .update({ status: "new", read_at: null })
        .eq("id", msg.id);
      fetchMessages();
    },
    [fetchMessages]
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-muted">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Messages</h1>
          <p className="mt-1 text-sm text-muted">
            Contact submissions ({counts.total} total)
            {counts.unread > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-900 dark:bg-yellow-900/50 dark:text-yellow-200">
                {counts.unread} new
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={fetchMessages}>
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-200">
          <p className="font-semibold">Couldn’t load messages.</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-xs">
            Make sure the migration was applied and you’re signed in as an admin.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, email, phone, city, or text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${INPUT_STYLES} w-full`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={INPUT_STYLES}
        >
          <option value="all">All</option>
          <option value="new">New</option>
          <option value="read">Read</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 8h10M7 12h10M7 16h6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-4 text-sm font-medium text-ink">No messages found</p>
            <p className="mt-1 text-sm text-muted">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Messages from the Contact page will appear here"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  <th className="px-6 py-3">From</th>
                  <th className="px-6 py-3">City</th>
                  <th className="px-6 py-3">Received</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const isRead = String(m.status || "new").toLowerCase() === "read";
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-border last:border-0 hover:bg-surface/60"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-ink">{m.name}</p>
                        <p className="text-xs text-muted">
                          {m.email} • {m.mobile}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs text-muted">
                          {m.message}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-ink">{m.city || "—"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-ink">{formatDateTime(m.created_at)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(
                            m.status
                          )}`}
                        >
                          {isRead ? "read" : "new"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setViewing(m)}
                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface/60 hover:text-ink"
                            title="View"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                          {isRead ? (
                            <button
                              onClick={() => markUnread(m)}
                              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-yellow-50 hover:text-yellow-800 dark:hover:bg-yellow-900/30 dark:hover:text-yellow-300"
                              title="Mark as new"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => markRead(m)}
                              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-300"
                              title="Mark as read"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ViewMessageModal
        open={!!viewing}
        message={viewing}
        onClose={() => setViewing(null)}
        onMarkRead={markRead}
        onMarkUnread={markUnread}
      />
    </div>
  );
}

