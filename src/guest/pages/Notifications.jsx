import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { useAuth } from "../../auth/useAuth.js";
import { useNotifications } from "../../notifications/useNotifications.js";

function formatWhen(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

export default function GuestNotifications() {
  const { user } = useAuth();
  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useNotifications({
    mode: "user",
    userId: user?.id,
    limit: 100,
  });

  const viewBookingHref = useCallback((n) => {
    const bookingId = n?.data?.booking_id;
    return bookingId ? `/my-bookings?highlight=${encodeURIComponent(bookingId)}` : "/my-bookings";
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Notifications</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Updates</h1>
          <p className="mt-1 text-sm text-muted">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={markAllRead} disabled={loading || unreadCount === 0}>
            Mark all as read
          </Button>
        </div>
      </div>

      {error ? (
        <Card>
          <p className="text-sm font-semibold text-ink">Error</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </Card>
      ) : loading ? (
        <Card>
          <p className="text-sm font-semibold text-ink">Loading notifications…</p>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <p className="text-sm font-semibold text-ink">No notifications</p>
          <p className="mt-1 text-sm text-muted">When a booking is approved, you’ll see it here.</p>
          <div className="mt-4">
            <Link to="/my-bookings">
              <Button variant="outline">View my bookings</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className={n.is_read ? "" : "ring-1 ring-brand-200"}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{n.title}</p>
                    {!n.is_read && (
                      <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                        New
                      </span>
                    )}
                  </div>
                  {n.body ? <p className="mt-1 text-sm text-muted">{n.body}</p> : null}
                  <p className="mt-2 text-xs text-muted">{formatWhen(n.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Link to={viewBookingHref(n)}>
                    <Button variant="outline">View booking</Button>
                  </Link>
                  {!n.is_read && (
                    <Button onClick={() => markRead(n.id)}>Mark as read</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

