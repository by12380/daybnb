import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "antd";
import { useDispatch, useSelector } from "react-redux";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Button from "../../components/ui/Button.jsx";
import { INPUT_STYLES } from "../../guest/components/ui/FormInput.jsx";
import {
  fetchMessages,
  markMessageRead,
  deleteMessage,
} from "../../redux/slices/contactSlice.js";

// Icons
function MailIcon({ className }) { return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>); }
function PhoneIcon({ className }) { return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>); }
function LocationIcon({ className }) { return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>); }
function UserIcon({ className }) { return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>); }

function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

const ViewMessageModal = React.memo(({ open, message, onClose, onMarkRead }) => {
  if (!message) return null;
  const formattedDate = new Date(message.created_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <Modal title="Message Details" open={open} onCancel={onClose} footer={<div className="flex justify-between">{!message.is_read && <Button variant="outline" onClick={() => onMarkRead(message.id)}>Mark as Read</Button>}<Button onClick={onClose}>Close</Button></div>} destroyOnClose width={600}>
      <div className="space-y-5 pt-4">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${message.is_read ? "bg-slate-100 text-slate-600" : "bg-brand-50 text-brand-700"}`}><span className={`h-2 w-2 rounded-full ${message.is_read ? "bg-slate-400" : "bg-brand-500"}`} />{message.is_read ? "Read" : "Unread"}</span>
          <span className="text-xs text-muted">{formattedDate}</span>
        </div>
        <div className="rounded-xl border border-border bg-surface/60 p-4">
          <h4 className="mb-3 text-sm font-medium text-ink">Contact Information</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted" /><span className="text-sm text-ink">{message.name}</span></div>
            <div className="flex items-center gap-2"><MailIcon className="h-4 w-4 text-muted" /><a href={`mailto:${message.email}`} className="text-sm text-brand-600 hover:text-brand-700">{message.email}</a></div>
            <div className="flex items-center gap-2"><PhoneIcon className="h-4 w-4 text-muted" /><a href={`tel:${message.mobile}`} className="text-sm text-brand-600 hover:text-brand-700">{message.mobile}</a></div>
            <div className="flex items-center gap-2"><LocationIcon className="h-4 w-4 text-muted" /><span className="text-sm text-ink">{message.city}</span></div>
          </div>
        </div>
        <div><h4 className="mb-2 text-sm font-medium text-ink">Message</h4><div className="rounded-xl border border-border bg-panel p-4"><p className="whitespace-pre-wrap text-sm text-ink">{message.message}</p></div></div>
        {message.user_id && (<div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3"><p className="text-xs text-blue-600">This message was sent by a registered user (ID: {message.user_id.slice(0, 8)}...)</p></div>)}
      </div>
    </Modal>
  );
});

const DeleteMessageModal = React.memo(({ open, message, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => { setDeleting(true); await onConfirm(message.id); setDeleting(false); };
  return (
    <Modal title="Delete Message" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <div className="space-y-4 pt-4">
        <p className="text-sm text-muted">Are you sure you want to delete this message? This action cannot be undone.</p>
        {message && (<div className="rounded-xl border border-red-100 bg-red-50 p-4"><p className="font-medium text-ink">{message.name}</p><p className="text-sm text-muted">{message.email}</p><p className="mt-2 line-clamp-2 text-sm text-muted">{message.message}</p></div>)}
        <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button className="!bg-red-600 hover:!bg-red-700" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete Message"}</Button></div>
      </div>
    </Modal>
  );
});

export default function AdminMessages() {
  const dispatch = useDispatch();
  const { messages, loading } = useSelector((state) => state.contact);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewingMessage, setViewingMessage] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(null);

  useEffect(() => { dispatch(fetchMessages()); }, [dispatch]);

  const filteredMessages = useMemo(() => {
    let result = messages || [];
    if (filterStatus === "unread") result = result.filter((m) => !m.is_read);
    else if (filterStatus === "read") result = result.filter((m) => m.is_read);
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter((m) => m.name?.toLowerCase().includes(search) || m.email?.toLowerCase().includes(search) || m.city?.toLowerCase().includes(search) || m.message?.toLowerCase().includes(search));
    }
    return result;
  }, [messages, filterStatus, searchTerm]);

  const unreadCount = useMemo(() => (messages || []).filter((m) => !m.is_read).length, [messages]);

  const handleMarkRead = useCallback((messageId) => {
    dispatch(markMessageRead(messageId));
    setViewingMessage((prev) => (prev?.id === messageId ? { ...prev, is_read: true } : prev));
  }, [dispatch]);

  const handleMarkAllRead = useCallback(() => {
    (messages || []).filter((m) => !m.is_read).forEach((m) => dispatch(markMessageRead(m.id)));
  }, [dispatch, messages]);

  const handleDelete = useCallback((messageId) => {
    dispatch(deleteMessage(messageId));
    setDeletingMessage(null);
  }, [dispatch]);

  const handleViewMessage = useCallback((message) => {
    setViewingMessage(message);
    if (!message.is_read) handleMarkRead(message.id);
  }, [handleMarkRead]);

  if (loading) {
    return (<div className="flex h-64 items-center justify-center"><div className="text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /><p className="mt-4 text-sm text-muted">Loading messages...</p></div></div>);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contact Messages"
        subtitle={(
          <>
            {(messages || []).length} total messages
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                {unreadCount} unread
              </span>
            )}
          </>
        )}
        actions={unreadCount > 0 ? <Button variant="outline" onClick={handleMarkAllRead}>Mark All as Read</Button> : null}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <input type="text" placeholder="Search messages..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${INPUT_STYLES} w-full sm:w-64`} />
        <div className="flex gap-2">
          {["all", "unread", "read"].map((status) => (
            <button key={status} onClick={() => setFilterStatus(status)} className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${filterStatus === status ? "bg-brand-600 text-white" : "border border-border bg-panel text-muted hover:bg-surface/60"}`}>
              {status}{status === "unread" && unreadCount > 0 && <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">{unreadCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {filteredMessages.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel py-12 text-center shadow-sm"><MailIcon className="mx-auto h-12 w-12 text-muted" /><p className="mt-4 text-sm font-medium text-ink">No messages found</p><p className="mt-1 text-sm text-muted">{searchTerm || filterStatus !== "all" ? "Try adjusting your filters" : "Messages from the contact form will appear here"}</p></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead><tr className="border-b border-border bg-surface/50"><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Status</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Name</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Email</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">City</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Message</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Date</th><th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Actions</th></tr></thead>
              <tbody className="divide-y divide-border">
                {filteredMessages.map((message) => (
                  <tr key={message.id} className={`transition-colors hover:bg-surface/30 ${!message.is_read ? "bg-brand-50/30" : ""}`}>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${message.is_read ? "bg-slate-100 text-slate-600" : "bg-brand-100 text-brand-700"}`}><span className={`h-1.5 w-1.5 rounded-full ${message.is_read ? "bg-slate-400" : "bg-brand-500"}`} />{message.is_read ? "Read" : "New"}</span></td>
                    <td className="px-4 py-3"><span className="font-medium text-ink">{message.name}</span></td>
                    <td className="px-4 py-3"><a href={`mailto:${message.email}`} className="text-sm text-brand-600 hover:text-brand-700">{message.email}</a></td>
                    <td className="px-4 py-3"><span className="text-sm text-muted">{message.city}</span></td>
                    <td className="max-w-[200px] px-4 py-3"><p className="truncate text-sm text-ink" title={message.message}>{message.message}</p></td>
                    <td className="px-4 py-3"><span className="text-xs text-muted">{getTimeAgo(message.created_at)}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleViewMessage(message)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-brand-50 hover:text-brand-600" title="View"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                        {!message.is_read && <button onClick={() => handleMarkRead(message.id)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-green-50 hover:text-green-600" title="Mark as read"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>}
                        <button onClick={() => setDeletingMessage(message)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600" title="Delete"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ViewMessageModal open={!!viewingMessage} message={viewingMessage} onClose={() => setViewingMessage(null)} onMarkRead={handleMarkRead} />
      <DeleteMessageModal open={!!deletingMessage} message={deletingMessage} onClose={() => setDeletingMessage(null)} onConfirm={handleDelete} />
    </div>
  );
}
