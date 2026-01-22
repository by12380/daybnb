import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { useAuth } from "../../auth/useAuth.js";

const LIKED_ROOMS_TABLE = "room_likes";

/**
 * Hook to manage liked rooms functionality.
 * - Only works for authenticated users
 * - Fetches likes from Supabase
 */
export function useLikedRooms() {
  const { user } = useAuth();
  const [likedRoomIds, setLikedRoomIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const previousUserIdRef = useRef(null);

  // Load liked rooms on mount or when user changes
  useEffect(() => {
    // If user signed out, clear likes
    if (!user?.id) {
      setLikedRoomIds(new Set());
      setLoading(false);
      previousUserIdRef.current = null;
      return;
    }

    // Skip if user hasn't changed
    if (previousUserIdRef.current === user.id) {
      return;
    }
    previousUserIdRef.current = user.id;

    let cancelled = false;

    async function loadLikedRooms() {
      setLoading(true);

      if (supabase) {
        // Fetch from Supabase for authenticated users
        const { data, error } = await supabase
          .from(LIKED_ROOMS_TABLE)
          .select("room_id")
          .eq("user_id", user.id);

        if (!cancelled) {
          if (error) {
            console.error("Error fetching liked rooms:", error);
            setLikedRoomIds(new Set());
          } else {
            const ids = new Set((data || []).map((item) => item.room_id));
            setLikedRoomIds(ids);
          }
          setLoading(false);
        }
      } else {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLikedRooms();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const toggleLike = useCallback(
    async (roomId) => {
      // Must be signed in to like
      if (!user?.id || !supabase) {
        console.warn("Must be signed in to like rooms");
        return;
      }

      const isLiked = likedRoomIds.has(roomId);

      // Optimistic update
      setLikedRoomIds((prev) => {
        const next = new Set(prev);
        if (isLiked) {
          next.delete(roomId);
        } else {
          next.add(roomId);
        }
        return next;
      });

      if (isLiked) {
        // Remove from Supabase
        const { error } = await supabase
          .from(LIKED_ROOMS_TABLE)
          .delete()
          .eq("user_id", user.id)
          .eq("room_id", roomId);

        if (error) {
          console.error("Error removing like:", error);
          // Revert on error
          setLikedRoomIds((prev) => {
            const next = new Set(prev);
            next.add(roomId);
            return next;
          });
        }
      } else {
        // Add to Supabase
        const { error } = await supabase
          .from(LIKED_ROOMS_TABLE)
          .insert({ user_id: user.id, room_id: roomId });

        if (error) {
          console.error("Error adding like:", error);
          // Revert on error
          setLikedRoomIds((prev) => {
            const next = new Set(prev);
            next.delete(roomId);
            return next;
          });
        }
      }
    },
    [likedRoomIds, user?.id]
  );

  const isLiked = useCallback(
    (roomId) => likedRoomIds.has(roomId),
    [likedRoomIds]
  );

  // Memoize the array to prevent unnecessary re-renders
  const likedRoomIdsArray = useMemo(() => [...likedRoomIds], [likedRoomIds]);
  const count = likedRoomIds.size;

  return {
    likedRoomIds: likedRoomIdsArray,
    isLiked,
    toggleLike,
    loading,
    count,
  };
}

export default useLikedRooms;
