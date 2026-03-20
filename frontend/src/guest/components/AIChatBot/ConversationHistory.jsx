import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function getRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupConversationsByDate(conversations) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = { Today: [], Yesterday: [], "This Week": [], Earlier: [] };

  conversations.forEach((conv) => {
    const d = new Date(conv.updatedAt || conv.createdAt);
    d.setHours(0, 0, 0, 0);

    if (d >= today) groups.Today.push(conv);
    else if (d >= yesterday) groups.Yesterday.push(conv);
    else if (d >= weekAgo) groups["This Week"].push(conv);
    else groups.Earlier.push(conv);
  });

  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

function ChatBubbleIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function EmptyState({ onNewConversation }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <ChatBubbleIcon />
      </div>
      <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">No conversations yet</p>
      <p className="mb-5 text-xs text-gray-400 dark:text-gray-500">
        Start a new chat to get help with rooms, bookings, and more.
      </p>
      <button
        onClick={onNewConversation}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-500/20 transition-all hover:shadow-lg"
      >
        <PlusIcon />
        New Conversation
      </button>
    </div>
  );
}

export default function ConversationHistory({
  conversations,
  activeConvId,
  onSelect,
  onDelete,
  onNewConversation,
  onClose,
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const grouped = groupConversationsByDate(conversations);

  const handleDelete = (e, convId) => {
    e.stopPropagation();
    if (confirmDeleteId === convId) {
      onDelete(convId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(convId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -20, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-1 flex-col overflow-hidden"
    >
      {/* Sub-header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <BackIcon />
          </button>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">History</h4>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {conversations.length}
          </span>
        </div>
        <button
          onClick={onNewConversation}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20"
        >
          <PlusIcon />
          New
        </button>
      </div>

      {/* Conversation list */}
      {conversations.length === 0 ? (
        <EmptyState onNewConversation={onNewConversation} />
      ) : (
        <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
          {grouped.map(([label, items]) => (
            <div key={label}>
              <p className="sticky top-0 z-10 bg-white/90 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 backdrop-blur-sm dark:bg-gray-900/90 dark:text-gray-500">
                {label}
              </p>
              <AnimatePresence>
                {items.map((conv) => {
                  const isActive = conv.id === activeConvId;
                  const msgCount = conv.messages.length;
                  const lastMsg = conv.messages[msgCount - 1];
                  const preview = lastMsg?.text
                    ? lastMsg.text.slice(0, 60) + (lastMsg.text.length > 60 ? "..." : "")
                    : lastMsg?.attachment
                      ? "Attachment"
                      : "No messages";

                  return (
                    <motion.button
                      key={conv.id}
                      layout
                      exit={{ opacity: 0, height: 0 }}
                      onClick={() => onSelect(conv.id)}
                      className={`group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                        isActive
                          ? "bg-brand-50 dark:bg-brand-900/15"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          isActive
                            ? "bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        <ChatBubbleIcon />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p
                            className={`truncate text-sm font-medium ${
                              isActive
                                ? "text-brand-700 dark:text-brand-300"
                                : "text-gray-900 dark:text-gray-100"
                            }`}
                          >
                            {conv.title}
                          </p>
                          <span className="ml-2 shrink-0 text-[10px] text-gray-400">
                            {getRelativeTime(conv.updatedAt || conv.createdAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between">
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {preview}
                          </p>
                          <div className="ml-2 flex shrink-0 items-center gap-2">
                            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-400 dark:bg-gray-800">
                              {msgCount} msg{msgCount !== 1 ? "s" : ""}
                            </span>
                            <button
                              onClick={(e) => handleDelete(e, conv.id)}
                              className={`rounded-lg p-1 transition-all ${
                                confirmDeleteId === conv.id
                                  ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                  : "text-gray-300 opacity-0 hover:bg-gray-100 hover:text-red-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
                              }`}
                              title={confirmDeleteId === conv.id ? "Click again to confirm" : "Delete"}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
