import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../auth/useAuth.js";
import {
  CHAT_ATTACHMENT_ACCEPT,
  formatAttachmentSize,
  isImageLikeMimeType,
  MAX_CHAT_ATTACHMENT_SIZE_BYTES,
} from "../../../components/chat/chatHelpers.js";
import EmailGate from "./EmailGate.jsx";
import ConversationHistory from "./ConversationHistory.jsx";

const AI_BOT_NAME = "Daybnb AI";

function generateId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getTimeLabel(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const QUICK_PROMPTS = [
  { label: "How to book?", text: "How do I book a room on Daybnb?" },
  { label: "Cancellation policy", text: "What is the cancellation policy?" },
  { label: "Payment methods", text: "What payment methods do you accept?" },
  { label: "Check-in process", text: "How does the check-in process work?" },
];

const BOT_RESPONSES = [
  "I'd be happy to help you with that! Let me look into the details for you.",
  "Great question! Here's what I can tell you about that...",
  "Thanks for asking! I'll provide you with the most up-to-date information.",
  "I understand your concern. Let me walk you through the process.",
];

function getSimulatedResponse() {
  return BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)];
}

function SparklesIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
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

function SendIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l7.293-7.293a4 4 0 00-5.657-5.657L5.757 10.757a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
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

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-purple-600">
        <SparklesIcon className="h-4 w-4 text-white" />
      </div>
      <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 dark:bg-gray-800">
        <div className="flex items-center gap-1">
          <motion.span
            className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          />
          <motion.span
            className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isUser }) {
  const hasAttachment = message.attachment;
  const isImage = hasAttachment && isImageLikeMimeType(message.attachment.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-purple-600">
          <SparklesIcon className="h-4 w-4 text-white" />
        </div>
      )}

      <div className={`max-w-[78%] space-y-1.5 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? "rounded-br-md bg-brand-600 text-white"
              : "rounded-bl-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          }`}
        >
          {message.text && (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
          )}

          {hasAttachment && (
            <div className={`${message.text ? "mt-2" : ""} overflow-hidden rounded-xl`}>
              {isImage && message.attachment.previewUrl ? (
                <img
                  src={message.attachment.previewUrl}
                  alt={message.attachment.name}
                  className="max-h-48 w-full rounded-lg object-cover"
                />
              ) : (
                <div
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
                    isUser
                      ? "border-white/15 bg-white/10"
                      : "border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isUser
                        ? "bg-white/15"
                        : "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"
                    }`}
                  >
                    <PaperclipIcon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{message.attachment.name}</span>
                    <span className="block text-[10px] opacity-70">
                      {formatAttachmentSize(message.attachment.size)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <p
          className={`px-1 text-[10px] ${
            isUser ? "text-right text-gray-400" : "text-gray-400"
          }`}
        >
          {getTimeLabel(message.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}

function AttachmentPreview({ attachment, onRemove }) {
  const previewUrl = useMemo(() => {
    if (!attachment || !isImageLikeMimeType(attachment.type)) return null;
    return URL.createObjectURL(attachment);
  }, [attachment]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!attachment) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mx-3 overflow-hidden"
    >
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
        {previewUrl ? (
          <img src={previewUrl} alt={attachment.name} className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
            <PaperclipIcon />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{attachment.name}</p>
          <p className="text-xs text-gray-500">{formatAttachmentSize(attachment.size)}</p>
        </div>
        <button
          onClick={onRemove}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        >
          <CloseIcon />
        </button>
      </div>
    </motion.div>
  );
}

const STORAGE_KEY = "daybnb_ai_chat";
const EMAIL_KEY = "daybnb_ai_email";

function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversations(conversations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    /* quota exceeded */
  }
}

function loadEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

function saveEmail(email) {
  try {
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    /* noop */
  }
}

export default function AIChatBot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [guestEmail, setGuestEmail] = useState(() => loadEmail());
  const [conversations, setConversations] = useState(() => loadConversations());
  const [activeConvId, setActiveConvId] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const isAuthenticated = Boolean(user) || Boolean(guestEmail);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConvId) || null,
    [conversations, activeConvId]
  );

  const messages = activeConversation?.messages || [];

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && activeConvId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, activeConvId]);

  const handleEmailSubmit = useCallback((email) => {
    setGuestEmail(email);
    saveEmail(email);
  }, []);

  const startNewConversation = useCallback(() => {
    const newConv = {
      id: generateId(),
      title: "New Conversation",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    setShowHistory(false);
    setInputValue("");
    setAttachment(null);
  }, []);

  const handleSelectConversation = useCallback((convId) => {
    setActiveConvId(convId);
    setShowHistory(false);
  }, []);

  const handleDeleteConversation = useCallback(
    (convId) => {
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        setActiveConvId(null);
      }
    },
    [activeConvId]
  );

  const addMessage = useCallback(
    (msg) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConvId) return c;
          const updatedMessages = [...c.messages, msg];
          const title =
            c.messages.length === 0 && msg.role === "user" && msg.text
              ? msg.text.slice(0, 50) + (msg.text.length > 50 ? "..." : "")
              : c.title;
          return { ...c, messages: updatedMessages, title, updatedAt: new Date().toISOString() };
        })
      );
    },
    [activeConvId]
  );

  const simulateBotResponse = useCallback(
    (userText) => {
      setIsTyping(true);
      const delay = 1000 + Math.random() * 1500;
      setTimeout(() => {
        const botMsg = {
          id: generateId(),
          role: "assistant",
          text: getSimulatedResponse(),
          timestamp: new Date().toISOString(),
        };
        addMessage(botMsg);
        setIsTyping(false);
      }, delay);
    },
    [addMessage]
  );

  const handleSend = useCallback(() => {
    if ((!inputValue.trim() && !attachment)) return;

    let attachData = null;
    if (attachment) {
      attachData = {
        name: attachment.name,
        size: attachment.size,
        type: attachment.type,
        previewUrl: isImageLikeMimeType(attachment.type)
          ? URL.createObjectURL(attachment)
          : null,
      };
    }

    const userMsg = {
      id: generateId(),
      role: "user",
      text: inputValue.trim(),
      attachment: attachData,
      timestamp: new Date().toISOString(),
    };

    addMessage(userMsg);
    setInputValue("");
    setAttachment(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";

    simulateBotResponse(userMsg.text);
  }, [inputValue, attachment, addMessage, simulateBotResponse]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_CHAT_ATTACHMENT_SIZE_BYTES) {
      setFileError("File must be 10 MB or smaller.");
      e.target.value = "";
      return;
    }
    setFileError("");
    setAttachment(file);
  };

  const handleQuickPrompt = (prompt) => {
    if (!activeConvId) {
      startNewConversation();
      setTimeout(() => {
        setInputValue(prompt.text);
      }, 50);
      return;
    }
    setInputValue(prompt.text);
    inputRef.current?.focus();
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!activeConvId && conversations.length === 0) {
      startNewConversation();
    } else if (!activeConvId && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  };

  const widgetSize = isExpanded
    ? "fixed inset-4 z-[9998] sm:inset-6 md:bottom-6 md:left-6 md:right-auto md:top-auto md:h-[85vh] md:w-[520px]"
    : "fixed bottom-24 left-4 z-[9998] h-[540px] w-[380px] sm:left-6 sm:h-[580px] sm:w-[400px]";

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleOpen}
            className="fixed bottom-6 left-6 z-[9998] flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 text-white shadow-lg shadow-brand-500/30 transition-shadow hover:shadow-xl hover:shadow-brand-500/40"
            aria-label="Open AI assistant"
          >
            <SparklesIcon className="h-6 w-6" />
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`${widgetSize} flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl dark:border-gray-700/80 dark:bg-gray-900`}
          >
            {/* Header */}
            <div className="relative flex items-center justify-between bg-gradient-to-r from-brand-600 via-brand-500 to-purple-600 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <SparklesIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{AI_BOT_NAME}</h3>
                  <p className="text-[11px] text-white/70">
                    {isTyping ? "Typing..." : "Always here to help"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowHistory((p) => !p)}
                  className={`rounded-lg p-2 transition-colors ${
                    showHistory ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-label="Conversation history"
                  title="Conversation history"
                >
                  <HistoryIcon />
                </button>
                <button
                  onClick={startNewConversation}
                  className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="New conversation"
                  title="New conversation"
                >
                  <PlusIcon />
                </button>
                <button
                  onClick={() => setIsExpanded((p) => !p)}
                  className="hidden rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:flex"
                  aria-label={isExpanded ? "Minimize" : "Expand"}
                  title={isExpanded ? "Minimize" : "Expand"}
                >
                  {isExpanded ? <MinimizeIcon /> : <ExpandIcon />}
                </button>
                <button
                  onClick={() => { setIsOpen(false); setIsExpanded(false); setShowHistory(false); }}
                  className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Decorative gradient glow */}
              <div className="pointer-events-none absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>

            {/* Body */}
            {!isAuthenticated ? (
              <EmailGate onSubmit={handleEmailSubmit} />
            ) : showHistory ? (
              <ConversationHistory
                conversations={conversations}
                activeConvId={activeConvId}
                onSelect={handleSelectConversation}
                onDelete={handleDeleteConversation}
                onNewConversation={startNewConversation}
                onClose={() => setShowHistory(false)}
              />
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
                  {messages.length === 0 && !isTyping ? (
                    <div className="flex h-full flex-col items-center justify-center px-4">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-purple-100 dark:from-brand-900/30 dark:to-purple-900/30">
                        <SparklesIcon className="h-8 w-8 text-brand-600 dark:text-brand-400" />
                      </div>
                      <h4 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
                        Hi there! How can I help?
                      </h4>
                      <p className="mb-6 text-center text-xs text-gray-500 dark:text-gray-400">
                        Ask me anything about rooms, bookings, payments, or procedures.
                      </p>
                      <div className="grid w-full grid-cols-2 gap-2">
                        {QUICK_PROMPTS.map((prompt) => (
                          <button
                            key={prompt.label}
                            onClick={() => handleQuickPrompt(prompt)}
                            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-xs font-medium text-gray-700 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-600 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
                          >
                            {prompt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          isUser={msg.role === "user"}
                        />
                      ))}
                      {isTyping && <TypingIndicator />}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Attachment preview */}
                <AnimatePresence>
                  {attachment && (
                    <AttachmentPreview
                      attachment={attachment}
                      onRemove={() => {
                        setAttachment(null);
                        setFileError("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    />
                  )}
                </AnimatePresence>

                {fileError && (
                  <p className="px-4 text-xs text-red-500">{fileError}</p>
                )}

                {/* Input area */}
                <div className="border-t border-gray-100 p-3 dark:border-gray-800">
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={CHAT_ATTACHMENT_ACCEPT}
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      aria-label="Attach file"
                    >
                      <PaperclipIcon />
                    </button>
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask me anything..."
                      className="max-h-24 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-brand-500"
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleSend}
                      disabled={!inputValue.trim() && !attachment}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 text-white shadow-md shadow-brand-500/20 transition-all disabled:opacity-40 disabled:shadow-none"
                      aria-label="Send message"
                    >
                      <SendIcon />
                    </motion.button>
                  </div>
                  <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-600">
                    AI responses are for guidance only. Verify important details.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
