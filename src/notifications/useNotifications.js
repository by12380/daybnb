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

  const enabled = useMemo(() => {
    if (!supabase) return false;
    if (mode === "admin") return true;
    if (mode === "user") return !!userId;
    return false;
  }, [mode, userId]);

  const fetchNotifications = useCallback(async () => {
    if (!enabled) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const key = `${mode}:${userId || ""}:${limit}`;
    lastFetchKeyRef.current = key;

    setLoading(true);
    setError("");

    const { data, error: fetchError } = await buildBaseQuery({ mode, userId }).limit(limit);

    // Ignore stale fetches if inputs changed mid-flight
    if (lastFetchKeyRef.current !== key) return;

    if (fetchError) {
      setError(fetchError.message || "Failed to load notifications.");
      setNotifications([]);
      setLoading(false);
      return;
    }

    setNotifications(data || []);
    setLoading(false);
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

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
  };
}

