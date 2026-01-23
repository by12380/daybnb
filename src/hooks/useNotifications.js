import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const NOTIFICATIONS_TABLE = "notifications";

/**
 * Hook for admin notifications (recipient_role = 'admin')
 */
export function useAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!supabase) {
      setError("Supabase not configured");
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from(NOTIFICATIONS_TABLE)
        .select("*")
        .eq("recipient_role", "admin")
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setNotifications(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching admin notifications:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    if (!supabase) return;

    try {
      const { error: deleteError, count } = await supabase
        .from(NOTIFICATIONS_TABLE)
        .delete()
        .eq("id", notificationId)
        .select();

      if (deleteError) {
        console.error("Error deleting notification:", deleteError);
        return;
      }

      console.log("Deleted notification:", notificationId, "count:", count);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  }, []);

  const deleteAllNotifications = useCallback(async () => {
    if (!supabase) return;

    try {
      const { error: deleteError } = await supabase
        .from(NOTIFICATIONS_TABLE)
        .delete()
        .eq("recipient_role", "admin")
        .select();

      if (deleteError) {
        console.error("Error deleting all notifications:", deleteError);
        return;
      }

      setNotifications([]);
    } catch (err) {
      console.error("Error deleting all notifications:", err);
    }
  }, []);

  const unreadCount = notifications.length;

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription for new notifications
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
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: NOTIFICATIONS_TABLE,
          filter: "recipient_role=eq.admin",
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    deleteNotification,
    deleteAllNotifications,
    refetch: fetchNotifications,
  };
}

/**
 * Hook for user-specific notifications (recipient_user_id = user.id)
 */
export function useUserNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from(NOTIFICATIONS_TABLE)
        .select("*")
        .eq("recipient_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setNotifications(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching user notifications:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const deleteNotification = useCallback(async (notificationId) => {
    if (!supabase) return;

    try {
      const { error: deleteError } = await supabase
        .from(NOTIFICATIONS_TABLE)
        .delete()
        .eq("id", notificationId)
        .select();

      if (deleteError) {
        console.error("Error deleting notification:", deleteError);
        return;
      }

      console.log("Deleted user notification:", notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  }, []);

  const deleteAllNotifications = useCallback(async () => {
    if (!supabase || !userId) return;

    try {
      const { error: deleteError } = await supabase
        .from(NOTIFICATIONS_TABLE)
        .delete()
        .eq("recipient_user_id", userId)
        .select();

      if (deleteError) {
        console.error("Error deleting all notifications:", deleteError);
        return;
      }

      setNotifications([]);
    } catch (err) {
      console.error("Error deleting all notifications:", err);
    }
  }, [userId]);

  const unreadCount = notifications.length;

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription for new notifications
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
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: NOTIFICATIONS_TABLE,
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    deleteNotification,
    deleteAllNotifications,
    refetch: fetchNotifications,
  };
}
