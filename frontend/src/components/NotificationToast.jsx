import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSocket } from "../lib/SocketProvider.jsx";

const TOAST_DURATION = 5000;
const MAX_VISIBLE_TOASTS = 3;

function getToastIcon(type) {
  switch (type) {
    case "booking_approved":
      return (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
          <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case "booking_rejected":
      return (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
          <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    case "booking_created":
      return (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
          <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    case "booking_updated":
      return (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
          <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M16.586 3.586a2 2 0 112.828 2.828L11 14.828l-4 1 1-4 8.586-8.414z" />
          </svg>
        </div>
      );
    case "booking_cancelled":
      return (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
          <svg className="h-4 w-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 7h14M5 21h14a2 2 0 002-2V9H3v10a2 2 0 002 2z" />
          </svg>
        </div>
      );
    case "contact_message":
      return (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
          <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50">
          <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      );
  }
}

const SingleToast = React.memo(({ toast, onDismiss }) => {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  const startDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    timerRef.current = setTimeout(startDismiss, TOAST_DURATION);
    return () => clearTimeout(timerRef.current);
  }, [startDismiss]);

  const handleMouseEnter = () => clearTimeout(timerRef.current);
  const handleMouseLeave = () => {
    timerRef.current = setTimeout(startDismiss, 2000);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`pointer-events-auto w-80 overflow-hidden rounded-xl border border-border bg-panel shadow-lg transition-all duration-300 sm:w-96 ${
        exiting
          ? "translate-x-full opacity-0"
          : "translate-x-0 opacity-100"
      }`}
      style={{ animation: exiting ? undefined : "slideInRight 0.3s ease-out" }}
    >
      <div className="flex items-start gap-3 p-4">
        {getToastIcon(toast.type)}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink dark:text-dark-ink">
            {toast.title}
          </p>
          <p className="mt-0.5 text-xs text-muted line-clamp-2 dark:text-dark-muted">
            {toast.body}
          </p>
        </div>
        <button
          onClick={() => startDismiss()}
          className="flex-shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-surface/60 hover:text-ink"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="h-1 bg-surface/40">
        <div
          className="h-full bg-brand-500 dark:bg-brand-400"
          style={{
            animation: `shrinkWidth ${TOAST_DURATION}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
});

let toastIdCounter = 0;

export default function NotificationToastContainer() {
  const socket = useSocket();
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((notification) => {
    const id = ++toastIdCounter;
    setToasts((prev) => {
      const next = [{ ...notification, id }, ...prev];
      return next.slice(0, MAX_VISIBLE_TOASTS);
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handler = (notification) => {
      addToast(notification);
    };

    socket.on("notification:new", handler);
    return () => socket.off("notification:new", handler);
  }, [socket, addToast]);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex flex-col gap-3">
      {toasts.map((toast) => (
        <SingleToast key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>,
    document.body
  );
}
