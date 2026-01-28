import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import { supabase } from "../../lib/supabaseClient.js";
import Button from "../../guest/components/ui/Button.jsx";
import { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";

// Icons
function MailIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function PhoneIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

function LocationIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function UserIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function ListIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function TableIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
    </svg>
  );
}

// View Message Modal
const ViewMessageModal = React.memo(({ open, message, onClose, onMarkRead }) => {
  if (!message) return null;

  const formattedDate = new Date(message.created_at).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Modal
      title="Message Details"
      open={open}
      onCancel={onClose}
      footer={
        <div className="flex justify-between">
          {!message.is_read && (
            <Button variant="outline" onClick={() => onMarkRead(message.id)}>
              Mark as Read
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </div>
      }
      destroyOnClose
      width={600}
    >
      <div className="space-y-5 pt-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              message.is_read
                ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                : "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${message.is_read ? "bg-slate-400" : "bg-brand-500"}`} />
            {message.is_read ? "Read" : "Unread"}
          </span>
          <span className="text-xs text-muted">{formattedDate}</span>
        </div>

        {/* Contact Info */}
        <div className="rounded-xl border border-border bg-surface/60 p-4 dark:border-dark-border dark:bg-dark-surface/60">
          <h4 className="mb-3 text-sm font-medium text-ink dark:text-dark-ink">Contact Information</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-muted" />
              <span className="text-sm text-ink dark:text-dark-ink">{message.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <MailIcon className="h-4 w-4 text-muted" />
              <a
                href={`mailto:${message.email}`}
                className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                {message.email}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <PhoneIcon className="h-4 w-4 text-muted" />
              <a
                href={`tel:${message.mobile}`}
                className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                {message.mobile}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <LocationIcon className="h-4 w-4 text-muted" />
              <span className="text-sm text-ink dark:text-dark-ink">{message.city}</span>
            </div>
          </div>
        </div>

        {/* Message Content */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-ink dark:text-dark-ink">Message</h4>
          <div className="rounded-xl border border-border bg-panel p-4 dark:border-dark-border">
            <p className="whitespace-pre-wrap text-sm text-ink dark:text-dark-ink">{message.message}</p>
          </div>
        </div>

        {/* User Info if logged in */}
        {message.user_id && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              This message was sent by a registered user (ID: {message.user_id.slice(0, 8)}...)
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
});

// Delete Confirmation Modal
const DeleteMessageModal = React.memo(({ open, message, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onConfirm(message.id);
    setDeleting(false);
  };

  return (
    <Modal
      title="Delete Message"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted dark:text-dark-muted">
          Are you sure you want to delete this message? This action cannot be undone.
        </p>

        {message && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="font-medium text-ink dark:text-dark-ink">{message.name}</p>
            <p className="text-sm text-muted dark:text-dark-muted">{message.email}</p>
            <p className="mt-2 line-clamp-2 text-sm text-muted dark:text-dark-muted">
              {message.message}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="!bg-red-600 hover:!bg-red-700"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Message"}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

// Card View Component
const CardView = React.memo(({ messages, onView, onMarkRead, onDelete }) => {
  return (
    <div className="space-y-3">
      {messages.map((message) => {
        const timeAgo = getTimeAgo(message.created_at);
        return (
          <div
            key={message.id}
            className={`rounded-2xl border bg-panel p-4 shadow-sm transition-all hover:shadow-md dark:hover:shadow-black/30 ${
              message.is_read
                ? "border-border dark:border-dark-border"
                : "border-brand-200 bg-brand-50/30 dark:border-brand-700 dark:bg-brand-900/10"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {/* Unread indicator */}
                <div
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    message.is_read ? "bg-transparent" : "bg-brand-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink dark:text-dark-ink">{message.name}</h3>
                    <span className="text-sm text-muted dark:text-dark-muted">·</span>
                    <span className="text-sm text-muted dark:text-dark-muted">{message.email}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted dark:text-dark-muted">
                    <span className="flex items-center gap-1">
                      <PhoneIcon className="h-3.5 w-3.5" />
                      {message.mobile}
                    </span>
                    <span className="flex items-center gap-1">
                      <LocationIcon className="h-3.5 w-3.5" />
                      {message.city}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-ink dark:text-dark-ink">
                    {message.message}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted dark:text-dark-muted">{timeAgo}</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2 border-t border-border pt-4 dark:border-dark-border">
              <button
                onClick={() => onView(message)}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-dark-border dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-400"
              >
                View Details
              </button>
              {!message.is_read && (
                <button
                  onClick={() => onMarkRead(message.id)}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-green-200 hover:bg-green-50 hover:text-green-600 dark:border-dark-border dark:hover:border-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400"
                >
                  Mark Read
                </button>
              )}
              <button
                onClick={() => onDelete(message)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-dark-border dark:hover:border-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
});

// Table View Component
const TableView = React.memo(({ messages, onView, onMarkRead, onDelete }) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-sm dark:border-dark-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-surface/50 dark:border-dark-border dark:bg-dark-surface/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted dark:text-dark-muted">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted dark:text-dark-muted">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted dark:text-dark-muted">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted dark:text-dark-muted">
                Mobile
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted dark:text-dark-muted">
                City
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted dark:text-dark-muted">
                Message
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted dark:text-dark-muted">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted dark:text-dark-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-dark-border">
            {messages.map((message) => (
              <tr
                key={message.id}
                className={`transition-colors hover:bg-surface/30 dark:hover:bg-dark-surface/30 ${
                  !message.is_read ? "bg-brand-50/30 dark:bg-brand-900/10" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                      message.is_read
                        ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        : "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${message.is_read ? "bg-slate-400" : "bg-brand-500"}`} />
                    {message.is_read ? "Read" : "New"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-ink dark:text-dark-ink">{message.name}</span>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`mailto:${message.email}`}
                    className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    {message.email}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`tel:${message.mobile}`}
                    className="text-sm text-muted hover:text-ink dark:text-dark-muted dark:hover:text-dark-ink"
                  >
                    {message.mobile}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted dark:text-dark-muted">{message.city}</span>
                </td>
                <td className="max-w-[200px] px-4 py-3">
                  <p className="truncate text-sm text-ink dark:text-dark-ink" title={message.message}>
                    {message.message}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted dark:text-dark-muted">
                    {getTimeAgo(message.created_at)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onView(message)}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20 dark:hover:text-brand-400"
                      title="View details"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    {!message.is_read && (
                      <button
                        onClick={() => onMarkRead(message.id)}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400"
                        title="Mark as read"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(message)}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, unread, read
  const [viewMode, setViewMode] = useState("table"); // card, table

  const [viewingMessage, setViewingMessage] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(null);

  const fetchMessages = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching messages:", error);
    }

    setMessages(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("contact-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contact_messages",
        },
        (payload) => {
          setMessages((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contact_messages",
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? payload.new : m))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "contact_messages",
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredMessages = useMemo(() => {
    let result = messages;

    // Filter by status
    if (filterStatus === "unread") {
      result = result.filter((m) => !m.is_read);
    } else if (filterStatus === "read") {
      result = result.filter((m) => m.is_read);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter((m) => {
        return (
          m.name?.toLowerCase().includes(search) ||
          m.email?.toLowerCase().includes(search) ||
          m.city?.toLowerCase().includes(search) ||
          m.message?.toLowerCase().includes(search)
        );
      });
    }

    return result;
  }, [messages, filterStatus, searchTerm]);

  const unreadCount = useMemo(() => messages.filter((m) => !m.is_read).length, [messages]);

  const handleMarkRead = useCallback(async (messageId) => {
    const { error } = await supabase
      .from("contact_messages")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("id", messageId);

    if (error) {
      console.error("Error marking message as read:", error);
      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m))
    );
    setViewingMessage((prev) => (prev?.id === messageId ? { ...prev, is_read: true } : prev));
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = messages.filter((m) => !m.is_read).map((m) => m.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("contact_messages")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .in("id", unreadIds);

    if (error) {
      console.error("Error marking all as read:", error);
      return;
    }

    setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
  }, [messages]);

  const handleDelete = useCallback(async (messageId) => {
    const { error } = await supabase
      .from("contact_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      console.error("Error deleting message:", error);
      return;
    }

    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setDeletingMessage(null);
  }, []);

  const handleViewMessage = useCallback((message) => {
    setViewingMessage(message);
    // Mark as read when viewing
    if (!message.is_read) {
      handleMarkRead(message.id);
    }
  }, [handleMarkRead]);

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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink dark:text-dark-ink">Contact Messages</h1>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">
            {messages.length} total messages
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllRead}>
              Mark All as Read
            </Button>
          )}
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${INPUT_STYLES} w-full sm:w-64`}
          />
          <div className="flex gap-2">
            {["all", "unread", "read"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  filterStatus === status
                    ? "bg-brand-600 text-white"
                    : "border border-border bg-panel text-muted hover:bg-surface/60 dark:border-dark-border"
                }`}
              >
                {status}
                {status === "unread" && unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center rounded-xl border border-border bg-panel p-1 dark:border-dark-border">
          <button
            onClick={() => setViewMode("card")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "card"
                ? "bg-brand-600 text-white"
                : "text-muted hover:text-ink dark:hover:text-dark-ink"
            }`}
          >
            <ListIcon className="h-4 w-4" />
            Cards
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "table"
                ? "bg-brand-600 text-white"
                : "text-muted hover:text-ink dark:hover:text-dark-ink"
            }`}
          >
            <TableIcon className="h-4 w-4" />
            Table
          </button>
        </div>
      </div>

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel py-12 text-center shadow-sm dark:border-dark-border">
          <MailIcon className="mx-auto h-12 w-12 text-muted" />
          <p className="mt-4 text-sm font-medium text-ink dark:text-dark-ink">No messages found</p>
          <p className="mt-1 text-sm text-muted dark:text-dark-muted">
            {searchTerm || filterStatus !== "all"
              ? "Try adjusting your filters"
              : "Messages from the contact form will appear here"}
          </p>
        </div>
      ) : viewMode === "card" ? (
        <CardView
          messages={filteredMessages}
          onView={handleViewMessage}
          onMarkRead={handleMarkRead}
          onDelete={setDeletingMessage}
        />
      ) : (
        <TableView
          messages={filteredMessages}
          onView={handleViewMessage}
          onMarkRead={handleMarkRead}
          onDelete={setDeletingMessage}
        />
      )}

      {/* Modals */}
      <ViewMessageModal
        open={!!viewingMessage}
        message={viewingMessage}
        onClose={() => setViewingMessage(null)}
        onMarkRead={handleMarkRead}
      />

      <DeleteMessageModal
        open={!!deletingMessage}
        message={deletingMessage}
        onClose={() => setDeletingMessage(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// Helper function to format time ago
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
