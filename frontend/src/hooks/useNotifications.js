import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchNotifications,
  fetchAdminNotifications,
  deleteNotification,
  deleteAllNotifications,
  addNotification,
} from "../redux/slices/notificationSlice.js";
import { useSocket } from "../lib/SocketProvider.jsx";

/**
 * Hook for admin notifications (recipient_role = 'admin').
 * Listens for real-time updates via Socket.IO.
 */
export function useAdminNotifications() {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { notifications, loading, error, unreadCount } = useSelector(
    (state) => state.notifications
  );

  // Fetch admin notifications via API on mount
  useEffect(() => {
    dispatch(fetchAdminNotifications());
  }, [dispatch]);

  // Listen for real-time notifications via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handler = (notification) => {
      console.log("📬 [admin] Real-time notification received:", notification);
      dispatch(addNotification(notification));
    };

    socket.on("notification:new", handler);

    return () => {
      socket.off("notification:new", handler);
    };
  }, [socket, dispatch]);

  const handleDeleteNotification = useCallback(
    (notificationId) => {
      dispatch(deleteNotification(notificationId));
    },
    [dispatch]
  );

  const handleDeleteAllNotifications = useCallback(() => {
    dispatch(deleteAllNotifications("admin"));
  }, [dispatch]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    deleteNotification: handleDeleteNotification,
    deleteAllNotifications: handleDeleteAllNotifications,
    refetch: () => dispatch(fetchAdminNotifications()),
  };
}

/**
 * Hook for user-specific notifications (recipient_user_id = user.id).
 * Listens for real-time updates via Socket.IO.
 */
export function useUserNotifications(userId) {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { notifications, loading, error, unreadCount } = useSelector(
    (state) => state.notifications
  );

  // Fetch user notifications via API on mount
  useEffect(() => {
    if (userId) {
      dispatch(fetchNotifications());
    }
  }, [dispatch, userId]);

  // Listen for real-time notifications via Socket.IO
  useEffect(() => {
    if (!socket || !userId) return;

    const handler = (notification) => {
      console.log("📬 [user] Real-time notification received:", notification);
      dispatch(addNotification(notification));
    };

    socket.on("notification:new", handler);

    return () => {
      socket.off("notification:new", handler);
    };
  }, [socket, dispatch, userId]);

  const handleDeleteNotification = useCallback(
    (notificationId) => {
      dispatch(deleteNotification(notificationId));
    },
    [dispatch]
  );

  const handleDeleteAllNotifications = useCallback(() => {
    dispatch(deleteAllNotifications());
  }, [dispatch]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    deleteNotification: handleDeleteNotification,
    deleteAllNotifications: handleDeleteAllNotifications,
    refetch: () => dispatch(fetchNotifications()),
  };
}

/**
 * Hook for owner notifications.
 * Works for both real owners and admins impersonating an owner.
 *
 * Uses a separate local state (not Redux) to avoid conflicts with
 * the admin notification slice when the same admin user views both panels.
 *
 * - Fetches owner notifications via API (the backend handles impersonation
 *   through the x-impersonate-owner header).
 * - Listens for real-time socket events on "notification:new".
 * - When admin is impersonating, emits "impersonate:start" / "impersonate:stop"
 *   so the socket server joins/leaves the owner's notification room.
 */
export function useOwnerNotifications(ownerId) {
  const socket = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const prevOwnerIdRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch owner notifications via API on mount / ownerId change
  useEffect(() => {
    if (!ownerId) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { default: api } = await import("../redux/api.js");
        const { data } = await api.get("/notifications");
        if (!cancelled) {
          setNotifications(data.notifications || []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [ownerId]);

  // Socket: tell the server to join/leave the owner's room when impersonating
  useEffect(() => {
    if (!socket || !ownerId) return;

    // If ownerId changed, leave old and join new
    if (prevOwnerIdRef.current && prevOwnerIdRef.current !== ownerId) {
      socket.emit("impersonate:stop");
    }

    socket.emit("impersonate:start", ownerId);
    prevOwnerIdRef.current = ownerId;

    return () => {
      socket.emit("impersonate:stop");
      prevOwnerIdRef.current = null;
    };
  }, [socket, ownerId]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket || !ownerId) return;

    const handler = (notification) => {
      // Only add notifications targeted at this owner
      if (notification.recipient_user_id !== ownerId) return;

      console.log("📬 [owner] Real-time notification received:", notification);
      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === notification.id);
        if (exists) return prev;
        return [notification, ...prev];
      });
    };

    socket.on("notification:new", handler);

    return () => {
      socket.off("notification:new", handler);
    };
  }, [socket, ownerId]);

  const handleDeleteNotification = useCallback(
    async (notificationId) => {
      try {
        const { default: api } = await import("../redux/api.js");
        await api.delete(`/notifications/${notificationId}`);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      } catch (err) {
        console.error("Failed to delete notification:", err);
      }
    },
    []
  );

  const handleDeleteAllNotifications = useCallback(async () => {
    try {
      const { default: api } = await import("../redux/api.js");
      await api.delete("/notifications/all");
      setNotifications([]);
    } catch (err) {
      console.error("Failed to delete all notifications:", err);
    }
  }, []);

  const refetch = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const { default: api } = await import("../redux/api.js");
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [ownerId]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    deleteNotification: handleDeleteNotification,
    deleteAllNotifications: handleDeleteAllNotifications,
    refetch,
  };
}
