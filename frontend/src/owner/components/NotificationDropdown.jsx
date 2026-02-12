import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useOwnerNotifications } from "../../hooks/useNotifications.js";
import { useAuth } from "../../auth/useAuth.js";
import { useProfile } from "../../auth/useProfile.js";
import { getImpersonation } from "../../redux/api.js";

function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getNotificationIcon(type) {
  switch (type) {
    case "booking_created":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
          <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    case "booking_updated":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
          <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M16.586 3.586a2 2 0 112.828 2.828L11 14.828l-4 1 1-4 8.586-8.414z" />
          </svg>
        </div>
      );
    case "booking_cancelled":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
          <svg className="h-4 w-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 7h14M5 21h14a2 2 0 002-2V9H3v10a2 2 0 002 2z" />
          </svg>
        </div>
      );
    case "booking_approved":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
          <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case "booking_rejected":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
          <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface/60 text-muted">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      );
  }
}

const NotificationItem = React.memo(({ notification, onMarkAsRead, onClose }) => {
  const bookingId = notification.data?.booking_id;

  return (
    <div className="flex gap-3 px-4 py-3 transition hover:bg-surface/60">
      {getNotificationIcon(notification.type)}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink dark:text-dark-ink">
          {notification.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted dark:text-dark-muted">{notification.body}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-muted dark:text-dark-muted">{formatTimeAgo(notification.created_at)}</span>
          {bookingId && (
            <Link
              to="/owner/bookings"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              onClick={onClose}
            >
              View booking
            </Link>
          )}
        </div>
      </div>
      <button
        onClick={() => onMarkAsRead(notification.id)}
        className="flex-shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
        title="Mark as read"
      >
        Mark as read
      </button>
    </div>
  );
});

export default function OwnerNotificationDropdown() {
  const { user } = useAuth();
  const { isAdmin } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Determine the effective owner ID:
  // If admin is impersonating → use the impersonated owner's ID.
  // If actual owner → use their own user ID.
  const impersonatedOwnerId = getImpersonation();
  const ownerId = (isAdmin && impersonatedOwnerId) ? impersonatedOwnerId : user?.id;

  const {
    notifications,
    loading,
    unreadCount,
    deleteNotification: markAsRead,
    deleteAllNotifications: markAllAsRead,
  } = useOwnerNotifications(ownerId);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!ownerId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative rounded-lg p-2 text-muted transition-colors hover:bg-surface/60 hover:text-ink"
        title="Notifications"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-2xl border border-border bg-panel shadow-xl sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="font-semibold text-ink">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-300"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600 dark:border-emerald-700 dark:border-t-emerald-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <svg className="mx-auto h-12 w-12 text-muted dark:text-dark-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="mt-2 text-sm font-medium text-ink dark:text-dark-ink">No notifications</p>
                <p className="mt-1 text-xs text-muted dark:text-dark-muted">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-border dark:divide-dark-border">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onClose={closeDropdown}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 dark:border-dark-border">
            {notifications.length > 0 && (
              <Link
                to="/owner/bookings"
                onClick={closeDropdown}
                className="block text-center text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                View all bookings
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
