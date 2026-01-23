import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const NOTIFICATIONS_TABLE = "notifications";

function buildBaseQuery({ mode, userId }) {
  let q = supabase.from(NOTIFICATIONS_TABLE).select("*").order("created_at", { ascending: false });
  if (mode === "admin") q = q.eq("recipient_role", "admin");
  if (mode === "user") q = q.eq("recipient_user_id", userId);
  return q;
}

export function useNotifications({ mode, userId, limit = 20 }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastFetchKeyRef = useRef("");
  const isMountedRef = useRef(true);

  const enabled = useMemo(() => {
    if (!supabase) return false;
    if (mode === "admin") return true;
    if (mode === "user") return !!userId;
    return false;
  }, [mode, userId]);

  const fetchNotifications = useCallback(async () => {
    if (!enabled) {
      if (isMountedRef.current) {
        setNotifications([]);
        setLoading(false);
      }
      return;
    }

    const key = `${mode}:${userId || ""}:${limit}`;
    lastFetchKeyRef.current = key;

    if (isMountedRef.current) {
      setLoading(true);
      setError("");
    }

    const { data, error: fetchError } = await buildBaseQuery({ mode, userId }).limit(limit);

    // Ignore stale fetches if inputs changed mid-flight
    if (lastFetchKeyRef.current !== key) return;

    if (fetchError) {
      if (isMountedRef.current) {
        setError(fetchError.message || "Failed to load notifications.");
        setNotifications([]);
        setLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setNotifications(data || []);
      setLoading(false);
    }
  }, [enabled, limit, mode, userId]);

  const markRead = useCallback(
    async (id) => {
      if (!enabled || !id) return;
      const { error: updateError } = await supabase
        .from(NOTIFICATIONS_TABLE)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);
      if (!updateError) fetchNotifications();
    },
    [enabled, fetchNotifications]
  );

  const markAllRead = useCallback(async () => {
    if (!enabled) return;
    let q = supabase.from(NOTIFICATIONS_TABLE).update({ is_read: true, read_at: new Date().toISOString() }).eq("is_read", false);
    if (mode === "admin") q = q.eq("recipient_role", "admin");
    if (mode === "user") q = q.eq("recipient_user_id", userId);
    const { error: updateError } = await q;
    if (!updateError) fetchNotifications();
  }, [enabled, fetchNotifications, mode, userId]);

  const deleteNotification = useCallback(
    async (id) => {
      if (!enabled || !id) return;

      // Optimistic UI removal
      if (isMountedRef.current) {
        setNotifications((prev) => (prev || []).filter((n) => n?.id !== id));
      }

      const { error: deleteError } = await supabase.from(NOTIFICATIONS_TABLE).delete().eq("id", id);

      // If delete fails, fall back to a refetch to keep UI consistent
      if (deleteError) fetchNotifications();
    },
    [enabled, fetchNotifications]
  );

  const clearAllNotifications = useCallback(async () => {
    if (!enabled) return;

    // Optimistic UI clear
    if (isMountedRef.current) setNotifications([]);

    let q = supabase.from(NOTIFICATIONS_TABLE).delete();
    if (mode === "admin") q = q.eq("recipient_role", "admin");
    if (mode === "user") q = q.eq("recipient_user_id", userId);

    const { error: deleteError } = await q;
    if (deleteError) fetchNotifications();
  }, [enabled, fetchNotifications, mode, userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Realtime updates
    const channelName = `noti:${mode}:${userId || "admin"}`;
    const filter = mode === "admin" ? "recipient_role=eq.admin" : `recipient_user_id=eq.${userId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: NOTIFICATIONS_TABLE, filter },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, fetchNotifications, mode, userId]);

  const unreadCount = useMemo(
    () => (notifications || []).reduce((acc, n) => acc + (n?.is_read ? 0 : 1), 0),
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markRead,
    markAllRead,
    deleteNotification,
    clearAllNotifications,
  };
}

