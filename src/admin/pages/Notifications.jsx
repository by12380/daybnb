import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import Card from "../../guest/components/ui/Card.jsx";
import Button from "../../guest/components/ui/Button.jsx";
import { useNotifications } from "../../notifications/useNotifications.js";

function formatWhen(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

export default function AdminNotifications() {
  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useNotifications({
    mode: "admin",
    limit: 100,
  });

  const handleViewBookings = useCallback((n) => {
    const bookingId = n?.data?.booking_id;
    return bookingId ? `/admin/bookings?highlight=${encodeURIComponent(bookingId)}` : "/admin/bookings";
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Notifications</h1>
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
          <p className="mt-1 text-sm text-muted">New booking requests will show up here.</p>
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
                  <Link to={handleViewBookings(n)}>
                    <Button variant="outline">View bookings</Button>
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

