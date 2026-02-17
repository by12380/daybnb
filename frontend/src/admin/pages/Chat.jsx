import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../auth/useAuth.js";
import { useSocket } from "../../lib/SocketProvider.jsx";
import {
  fetchPanelConversations,
  fetchMessages,
  sendMessage,
  setActiveConversation,
  clearActiveConversation,
  addIncomingMessage,
  markConversationRead,
} from "../../redux/slices/chatSlice.js";

function getTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function UserAvatar({ name, size = "md" }) {
  const sizeClasses = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-lg" : "h-10 w-10 text-sm";
  const initial = (name || "?").charAt(0).toUpperCase();
  const colors = [
    "bg-brand-500", "bg-emerald-500", "bg-purple-500",
    "bg-rose-500", "bg-amber-500", "bg-cyan-500",
  ];
  const colorIndex = (name || "").length % colors.length;

  return (
    <div className={`${sizeClasses} ${colors[colorIndex]} flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}>
      {initial}
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = {
    customer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    owner: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${styles[role] || styles.customer}`}>
      {role || "customer"}
    </span>
  );
}

export default function AdminChat() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const socket = useSocket();

  const { conversations, activeConversationId, messages, loading, messagesLoading } =
    useSelector((s) => s.chat);

  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchPanelConversations());
  }, [dispatch]);

  // Socket listener
  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      dispatch(addIncomingMessage(payload));
    };
    socket.on("chat:message", handler);
    return () => socket.off("chat:message", handler);
  }, [socket, dispatch]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages[activeConversationId]]);

  // Join socket room
  useEffect(() => {
    if (activeConversationId && socket) {
      socket.emit("chat:join", activeConversationId);
      dispatch(fetchMessages(activeConversationId));
      dispatch(markConversationRead(activeConversationId));
    }
    return () => {
      if (socket && activeConversationId) {
        socket.emit("chat:leave", activeConversationId);
      }
    };
  }, [activeConversationId, socket, dispatch]);

  useEffect(() => {
    if (activeConversationId) inputRef.current?.focus();
  }, [activeConversationId]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || sending || !activeConversationId) return;
    setSending(true);
    try {
      await dispatch(
        sendMessage({ conversationId: activeConversationId, content: inputValue.trim() })
      ).unwrap();
      setInputValue("");
    } catch {
      // handled
    }
    setSending(false);
  }, [activeConversationId, dispatch, inputValue, sending]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm) return true;
    const name = (conv.other_participant?.full_name || conv.other_participant?.email || "").toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const currentMessages = messages[activeConversationId] || [];
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink dark:text-dark-ink">Customer Chat</h1>
          <p className="mt-1 text-sm text-muted">
            {conversations.length} conversations
            {totalUnread > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                {totalUnread} unread
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-220px)] min-h-[400px] overflow-hidden rounded-2xl border border-border bg-panel shadow-sm">
        {/* Sidebar */}
        <div className="flex w-80 shrink-0 flex-col border-r border-border">
          {/* Search */}
          <div className="border-b border-border p-3">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-dark-border dark:bg-dark-navy/60 dark:text-dark-ink"
            />
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <svg className="h-10 w-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="mt-3 text-sm font-medium text-ink dark:text-dark-ink">No conversations</p>
                <p className="mt-1 text-xs text-muted">Customer messages will appear here</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => dispatch(setActiveConversation(conv.id))}
                  className={`flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-surface/60 ${
                    activeConversationId === conv.id
                      ? "bg-brand-50/80 dark:bg-brand-900/20"
                      : ""
                  }`}
                >
                  <UserAvatar name={conv.other_participant?.full_name || conv.other_participant?.email} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-ink dark:text-dark-ink">
                          {conv.other_participant?.full_name || conv.other_participant?.email || "Customer"}
                        </p>
                        <RoleBadge role={conv.other_participant?.user_type} />
                      </div>
                      <span className="ml-2 shrink-0 text-[10px] text-muted">
                        {getTimeAgo(conv.last_message?.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs text-muted">
                        {conv.last_message?.content || "No messages yet"}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="ml-2 flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex flex-1 flex-col">
          {activeConversationId && activeConversation ? (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={activeConversation.other_participant?.full_name || activeConversation.other_participant?.email}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink dark:text-dark-ink">
                        {activeConversation.other_participant?.full_name ||
                          activeConversation.other_participant?.email ||
                          "Customer"}
                      </p>
                      <RoleBadge role={activeConversation.other_participant?.user_type} />
                    </div>
                    <p className="text-xs text-muted">
                      {activeConversation.other_participant?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 [scrollbar-width:thin]">
                {messagesLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                  </div>
                ) : currentMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <p className="text-sm text-muted">No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentMessages.map((msg) => {
                      const isMine = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[65%] rounded-2xl px-4 py-2.5 ${
                              isMine
                                ? "rounded-br-md bg-brand-600 text-white"
                                : "rounded-bl-md bg-surface text-ink dark:bg-dark-navy dark:text-dark-ink"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                            <p
                              className={`mt-1 text-right text-[10px] ${
                                isMine ? "text-white/60" : "text-muted"
                              }`}
                            >
                              {getTimeAgo(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-border px-6 py-4">
                <div className="flex items-end gap-3">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your reply..."
                    className="max-h-24 flex-1 resize-none rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-dark-border dark:bg-dark-navy/60 dark:text-dark-ink"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || sending}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="rounded-2xl bg-surface/60 p-6 dark:bg-dark-navy/40">
                <svg className="mx-auto h-12 w-12 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="mt-4 text-sm font-medium text-ink dark:text-dark-ink">
                  Select a conversation
                </p>
                <p className="mt-1 text-xs text-muted">
                  Choose a customer from the left to view and reply to messages
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
