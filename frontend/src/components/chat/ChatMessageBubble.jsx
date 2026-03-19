import React from "react";
import {
  formatAttachmentSize,
  getChatMessagePreview,
  isImageAttachment,
} from "./chatHelpers.js";

const TONE_STYLES = {
  brand: {
    mine: "rounded-br-md bg-brand-600 text-white",
    other: "rounded-bl-md bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100",
    mineMuted: "text-white/60",
    otherMuted: "text-gray-400 dark:text-gray-400",
    mineAttachment: "border border-white/15 bg-white/10",
    otherAttachment: "border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800/70",
    fileIcon: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200",
  },
  emerald: {
    mine: "rounded-br-md bg-emerald-600 text-white",
    other: "rounded-bl-md bg-surface text-ink dark:bg-dark-navy dark:text-dark-ink",
    mineMuted: "text-white/60",
    otherMuted: "text-muted",
    mineAttachment: "border border-white/15 bg-white/10",
    otherAttachment: "border border-border bg-white/90 dark:border-dark-border dark:bg-dark-navy/60",
    fileIcon:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
};

function PaperclipIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l7.293-7.293a4 4 0 00-5.657-5.657L5.757 10.757a6 6 0 108.486 8.486L20.5 13"
      />
    </svg>
  );
}

function AttachmentCard({ message, isMine, styles }) {
  if (!message?.attachment_url) return null;

  const attachmentName =
    message.attachment_name || getChatMessagePreview(message) || "Attachment";
  const attachmentMeta = formatAttachmentSize(message.attachment_size);
  const cardClasses = isMine ? styles.mineAttachment : styles.otherAttachment;

  if (isImageAttachment(message)) {
    return (
      <a
        href={message.attachment_url}
        target="_blank"
        rel="noreferrer"
        className={`mt-2 block overflow-hidden rounded-xl ${cardClasses}`}
      >
        <img
          src={message.attachment_url}
          alt={attachmentName}
          className="max-h-60 w-full object-cover"
          loading="lazy"
        />
        <div className="px-3 py-2">
          <p className="truncate text-xs font-medium">{attachmentName}</p>
          {attachmentMeta ? <p className="mt-0.5 text-[10px] opacity-80">{attachmentMeta}</p> : null}
        </div>
      </a>
    );
  }

  return (
    <a
      href={message.attachment_url}
      target="_blank"
      rel="noreferrer"
      className={`mt-2 flex items-center gap-3 rounded-xl px-3 py-2 transition-opacity hover:opacity-90 ${cardClasses}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.fileIcon}`}>
        <PaperclipIcon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{attachmentName}</span>
        {attachmentMeta ? <span className="mt-0.5 block text-[10px] opacity-80">{attachmentMeta}</span> : null}
      </span>
    </a>
  );
}

export default function ChatMessageBubble({
  message,
  isMine,
  timeLabel,
  tone = "brand",
}) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.brand;
  const text = typeof message?.content === "string" ? message.content.trim() : "";

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
          isMine ? styles.mine : styles.other
        }`}
      >
        {text ? <p className="whitespace-pre-wrap break-words text-sm">{text}</p> : null}
        <AttachmentCard message={message} isMine={isMine} styles={styles} />
        <p
          className={`mt-1 text-right text-[10px] ${
            isMine ? styles.mineMuted : styles.otherMuted
          }`}
        >
          {timeLabel}
        </p>
      </div>
    </div>
  );
}
