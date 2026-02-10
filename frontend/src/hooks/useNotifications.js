import { useCallback, useEffect } from "react";
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
