import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchNotifications,
  fetchAdminNotifications,
  deleteNotification,
  deleteAllNotifications,
} from "../redux/slices/notificationSlice.js";
import { supabase } from "../lib/supabaseClient.js";

const NOTIFICATIONS_TABLE = "notifications";

/**
 * Hook for admin notifications (recipient_role = 'admin')
 */
export function useAdminNotifications() {
  const dispatch = useDispatch();
  const { notifications, loading, error, unreadCount } = useSelector(
    (state) => state.notifications
  );

  // Fetch admin notifications via API
  useEffect(() => {
    dispatch(fetchAdminNotifications());
  }, [dispatch]);

  // Real-time subscription for new admin notifications
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: NOTIFICATIONS_TABLE,
          filter: "recipient_role=eq.admin",
        },
        () => {
          // Re-fetch on new notification
          dispatch(fetchAdminNotifications());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dispatch]);

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
 * Hook for user-specific notifications (recipient_user_id = user.id)
 */
export function useUserNotifications(userId) {
  const dispatch = useDispatch();
  const { notifications, loading, error, unreadCount } = useSelector(
    (state) => state.notifications
  );

  // Fetch user notifications via API
  useEffect(() => {
    if (userId) {
      dispatch(fetchNotifications());
    }
  }, [dispatch, userId]);

  // Real-time subscription for new user notifications
  useEffect(() => {
    if (!supabase || !userId) return;

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: NOTIFICATIONS_TABLE,
          filter: `recipient_user_id=eq.${userId}`,
        },
        () => {
          // Re-fetch on new notification
          dispatch(fetchNotifications());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dispatch, userId]);

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
