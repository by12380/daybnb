import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../auth/useAuth.js";
import { useSocket } from "../../lib/SocketProvider.jsx";
import ChatComposer from "../../components/chat/ChatComposer.jsx";
import ChatMessageBubble from "../../components/chat/ChatMessageBubble.jsx";
import { getChatMessagePreview } from "../../components/chat/chatHelpers.js";
import {
  fetchChatContacts,
  fetchConversations,
  fetchMessages,
  sendMessage,
  startConversation,
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
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ChatIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

function UserAvatar({ name, size = "md" }) {
  const sizeClasses = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  const initial = (name || "?").charAt(0).toUpperCase();
  const colors = [
    "bg-brand-500", "bg-emerald-500", "bg-purple-500",
    "bg-rose-500", "bg-amber-500", "bg-cyan-500",
  ];
  const colorIndex = (name || "").length % colors.length;

  return (
    <div className={`${sizeClasses} ${colors[colorIndex]} flex items-center justify-center rounded-full font-semibold text-white`}>
      {initial}
    </div>
  );
}

// ── Contact List View ───────────────────────────────────────
function ContactList({ contacts, conversations, onSelectContact, onSelectConversation, loading }) {
  const hasConversations = conversations.length > 0;
  const hasContacts = contacts.length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Existing conversations */}
      {hasConversations && (
        <div className="flex-1 overflow-y-auto">
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Recent Chats
          </p>
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <UserAvatar name={conv.other_participant?.full_name || conv.other_participant?.email} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {conv.other_participant?.full_name || conv.other_participant?.email || "User"}
                  </p>
                  <span className="ml-2 shrink-0 text-[10px] text-gray-400">
                    {getTimeAgo(conv.last_message?.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {getChatMessagePreview(conv.last_message)}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="ml-2 flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New contact section */}
      {hasContacts && (
        <div className={hasConversations ? "border-t border-gray-100 dark:border-gray-700" : "flex-1 overflow-y-auto"}>
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Start New Chat
          </p>
          {contacts
            .filter(
              (contact) =>
                !conversations.some(
                  (c) => c.other_participant?.id === contact.id
                )
            )
            .map((contact) => (
              <button
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <UserAvatar name={contact.full_name || contact.email} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {contact.chat_label || contact.full_name || contact.email}
                  </p>
                  <p className="text-xs capitalize text-gray-400">
                    {contact.user_type === "admin" ? "Support" : "Room Owner"}
                  </p>
                </div>
              </button>
            ))}
        </div>
      )}

      {!hasConversations && !hasContacts && !loading && (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <ChatIcon />
          <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">No chats yet</p>
          <p className="mt-1 text-xs text-gray-400">Book a room to chat with owners</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        </div>
      )}
    </div>
  );
}

// ── Chat Messages View ──────────────────────────────────────
function ChatMessages({ conversationId, recipientName, onBack, currentUserId }) {
  const dispatch = useDispatch();
  const socket = useSocket();
  const messages = useSelector((s) => s.chat.messages[conversationId] || []);
  const messagesLoading = useSelector((s) => s.chat.messagesLoading);
  const [inputValue, setInputValue] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (conversationId) {
      dispatch(fetchMessages(conversationId));
      dispatch(markConversationRead(conversationId));
      if (socket) {
        socket.emit("chat:join", conversationId);
      }
    }
    return () => {
      if (socket && conversationId) {
        socket.emit("chat:leave", conversationId);
      }
    };
  }, [conversationId, dispatch, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

  useEffect(() => {
    setAttachment(null);
  }, [conversationId]);

  const handleSend = useCallback(async () => {
    if ((!inputValue.trim() && !attachment) || sending) return;
    setSending(true);
    try {
      await dispatch(
        sendMessage({ conversationId, content: inputValue, attachment })
      ).unwrap();
      setInputValue("");
      setAttachment(null);
    } catch {
      // Error handled by slice
    }
    setSending(false);
  }, [attachment, conversationId, dispatch, inputValue, sending]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-700">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <BackIcon />
        </button>
        <UserAvatar name={recipientName} size="sm" />
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {recipientName}
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:thin]">
        {messagesLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-xs text-gray-400">No messages yet. Say hello!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              return (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  isMine={isMine}
                  timeLabel={getTimeAgo(msg.created_at)}
                  tone="brand"
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 p-3 dark:border-gray-700">
        <ChatComposer
          value={inputValue}
          onChange={setInputValue}
          attachment={attachment}
          onAttachmentChange={setAttachment}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          inputRef={inputRef}
          sending={sending}
          tone="brand"
        />
      </div>
    </div>
  );
}

// ── Main Widget ─────────────────────────────────────────────
export default function ChatWidget() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const socket = useSocket();

  const { contacts, conversations, activeConversationId, loading } = useSelector(
    (s) => s.chat
  );

  const [isOpen, setIsOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [starting, setStarting] = useState(false);

  // Fetch contacts and conversations when widget opens
  useEffect(() => {
    if (isOpen && user) {
      dispatch(fetchChatContacts());
      dispatch(fetchConversations());
    }
  }, [isOpen, user, dispatch]);

  // Listen for incoming socket messages
  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      dispatch(addIncomingMessage(payload));
    };
    socket.on("chat:message", handler);
    return () => socket.off("chat:message", handler);
  }, [socket, dispatch]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const handleSelectContact = async (contact) => {
    if (starting) return;
    setStarting(true);
    try {
      const result = await dispatch(startConversation(contact.id)).unwrap();
      setSelectedRecipient({
        name: contact.chat_label || contact.full_name || contact.email,
        id: contact.id,
      });
      dispatch(setActiveConversation(result.id));
    } catch (err) {
      console.error("Failed to start conversation:", err);
    } finally {
      setStarting(false);
    }
  };

  const handleSelectConversation = (conv) => {
    setSelectedRecipient({
      name: conv.other_participant?.full_name || conv.other_participant?.email || "User",
      id: conv.other_participant?.id,
    });
    dispatch(setActiveConversation(conv.id));
  };

  const handleBack = () => {
    dispatch(clearActiveConversation());
    setSelectedRecipient(null);
    dispatch(fetchConversations());
  };

  const handleClose = () => {
    setIsOpen(false);
    dispatch(clearActiveConversation());
    setSelectedRecipient(null);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating chat button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all hover:bg-brand-700 hover:shadow-xl active:scale-95"
        aria-label="Open chat"
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
        {!isOpen && totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalUnread}
          </span>
        )}
      </button>

      {/* Chat popup window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[9999] flex h-[480px] w-[360px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:h-[520px]">
          {/* Header */}
          <div className="flex items-center justify-between bg-brand-600 px-4 py-3">
            <h3 className="text-base font-semibold text-white">
              {activeConversationId ? "Chat" : "Messages"}
            </h3>
            <button
              onClick={handleClose}
              className="rounded-lg p-1 text-white/80 transition-colors hover:text-white"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Body */}
          {activeConversationId ? (
            <ChatMessages
              conversationId={activeConversationId}
              recipientName={selectedRecipient?.name || "User"}
              onBack={handleBack}
              currentUserId={user.id}
            />
          ) : (
            <ContactList
              contacts={contacts}
              conversations={conversations}
              onSelectContact={handleSelectContact}
              onSelectConversation={handleSelectConversation}
              loading={loading}
            />
          )}
        </div>
      )}
    </>
  );
}
