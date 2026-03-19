import React, { useEffect, useMemo, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import {
  CHAT_ATTACHMENT_ACCEPT,
  formatAttachmentSize,
  isImageLikeMimeType,
  MAX_CHAT_ATTACHMENT_SIZE_BYTES,
} from "./chatHelpers.js";

const TONE_STYLES = {
  brand: {
    surface:
      "border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:ring-brand-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
    iconButton:
      "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
    iconButtonActive:
      "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200",
    preview:
      "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200",
    error: "text-red-500",
    sendButton: "bg-brand-600 hover:bg-brand-700",
  },
  emerald: {
    surface:
      "border-border bg-surface/60 text-ink placeholder:text-muted focus:border-emerald-400 focus:ring-emerald-400 dark:border-dark-border dark:bg-dark-navy/60 dark:text-dark-ink",
    iconButton:
      "text-muted hover:bg-surface hover:text-ink dark:text-muted dark:hover:bg-dark-navy dark:hover:text-dark-ink",
    iconButtonActive:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
    preview:
      "border-border bg-surface/70 text-ink dark:border-dark-border dark:bg-dark-navy/60 dark:text-dark-ink",
    error: "text-red-500",
    sendButton: "bg-emerald-600 hover:bg-emerald-700",
  },
};

function EmojiIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l7.293-7.293a4 4 0 00-5.657-5.657L5.757 10.757a6 6 0 108.486 8.486L20.5 13"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function ChatComposer({
  value,
  onChange,
  attachment,
  onAttachmentChange,
  onSend,
  onKeyDown,
  placeholder,
  inputRef,
  sending = false,
  tone = "brand",
}) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.brand;
  const fileInputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPopoverRef = useRef(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [fileError, setFileError] = useState("");

  const previewUrl = useMemo(() => {
    if (!attachment || !isImageLikeMimeType(attachment.type)) return null;
    return URL.createObjectURL(attachment);
  }, [attachment]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!emojiOpen) return undefined;

    const handleClickOutside = (event) => {
      if (emojiPopoverRef.current?.contains(event.target)) return;
      if (emojiButtonRef.current?.contains(event.target)) return;
      setEmojiOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [emojiOpen]);

  const handleEmojiClick = (emojiData) => {
    onChange(`${value || ""}${emojiData.emoji}`);
  };

  const clearAttachment = () => {
    setFileError("");
    onAttachmentChange?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_CHAT_ATTACHMENT_SIZE_BYTES) {
      setFileError("Attachments must be 10 MB or smaller.");
      onAttachmentChange?.(null);
      event.target.value = "";
      return;
    }

    setFileError("");
    onAttachmentChange?.(file);
  };

  const canSend = Boolean((value || "").trim() || attachment) && !sending;

  return (
    <div className="space-y-2">
      {attachment ? (
        <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${styles.preview}`}>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={attachment.name}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
              <PaperclipIcon />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{attachment.name}</p>
            <p className="text-xs opacity-80">{formatAttachmentSize(attachment.size)}</p>
          </div>
          <button
            type="button"
            onClick={clearAttachment}
            className="rounded-lg p-1.5 opacity-70 transition-opacity hover:opacity-100"
            aria-label="Remove attachment"
          >
            <CloseIcon />
          </button>
        </div>
      ) : null}

      {fileError ? <p className={`text-xs ${styles.error}`}>{fileError}</p> : null}

      <div className="relative flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={CHAT_ATTACHMENT_ACCEPT}
          className="hidden"
          onChange={handleFileSelection}
        />

        <button
          ref={emojiButtonRef}
          type="button"
          onClick={() => setEmojiOpen((current) => !current)}
          className={`rounded-xl p-2 transition-colors ${
            emojiOpen ? styles.iconButtonActive : styles.iconButton
          }`}
          aria-label="Add emoji"
        >
          <EmojiIcon />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-xl p-2 transition-colors ${styles.iconButton}`}
          aria-label="Attach file"
        >
          <PaperclipIcon />
        </button>

        {emojiOpen ? (
          <div
            ref={emojiPopoverRef}
            className="absolute bottom-full left-0 z-20 mb-3 overflow-hidden rounded-2xl border border-gray-200 shadow-2xl dark:border-gray-700"
          >
            <EmojiPicker
              width={320}
              height={360}
              onEmojiClick={handleEmojiClick}
              lazyLoadEmojis
            />
          </div>
        ) : null}

        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`max-h-24 flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none transition-colors focus:ring-1 ${styles.surface}`}
        />

        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-colors disabled:opacity-40 ${styles.sendButton}`}
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
