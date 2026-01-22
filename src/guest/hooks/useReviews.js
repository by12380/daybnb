import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { useAuth } from "../../auth/useAuth.js";

const REVIEWS_TABLE = "room_reviews";

/**
 * Hook to manage room reviews.
 * Fetches reviews for a room and allows users to submit reviews.
 */
export function useReviews(roomId) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userReview, setUserReview] = useState(null);

  // Calculate average rating
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  // Fetch reviews for the room
  const fetchReviews = useCallback(async () => {
    if (!roomId || !supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from(REVIEWS_TABLE)
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching reviews:", fetchError);
      setError(fetchError.message);
      setReviews([]);
    } else {
      setReviews(data || []);
      // Check if current user has a review
      if (user?.id) {
        const existing = (data || []).find((r) => r.user_id === user.id);
        setUserReview(existing || null);
      }
    }

    setLoading(false);
  }, [roomId, user?.id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Submit a new review
  const submitReview = useCallback(
    async ({ rating, comment, bookingId = null }) => {
      if (!user?.id || !roomId || !supabase) {
        return { error: "You must be signed in to submit a review." };
      }

      if (!rating || rating < 1 || rating > 5) {
        return { error: "Please select a rating between 1 and 5 stars." };
      }

      const reviewData = {
        room_id: roomId,
        user_id: user.id,
        user_email: user.email || null,
        user_full_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Anonymous",
        rating,
        note: comment?.trim() || null,
        booking_id: bookingId || null,
      };

      // Check if user already has a review
      if (userReview) {
        // Update existing review
        const { data, error: updateError } = await supabase
          .from(REVIEWS_TABLE)
          .update({
            rating,
            note: comment?.trim() || null,
          })
          .eq("id", userReview.id)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating review:", updateError);
          return { error: updateError.message };
        }

        setUserReview(data);
        await fetchReviews();
        return { success: true, data };
      } else {
        // Create new review
        const { data, error: insertError } = await supabase
          .from(REVIEWS_TABLE)
          .insert(reviewData)
          .select()
          .single();

        if (insertError) {
          console.error("Error submitting review:", insertError);
          return { error: insertError.message };
        }

        setUserReview(data);
        await fetchReviews();
        return { success: true, data };
      }
    },
    [user?.id, user?.email, user?.user_metadata, roomId, userReview, fetchReviews]
  );

  // Delete user's review
  const deleteReview = useCallback(async () => {
    if (!userReview?.id || !supabase) {
      return { error: "No review to delete." };
    }

    const { error: deleteError } = await supabase
      .from(REVIEWS_TABLE)
      .delete()
      .eq("id", userReview.id);

    if (deleteError) {
      console.error("Error deleting review:", deleteError);
      return { error: deleteError.message };
    }

    setUserReview(null);
    await fetchReviews();
    return { success: true };
  }, [userReview?.id, fetchReviews]);

  return {
    reviews,
    loading,
    error,
    userReview,
    averageRating,
    reviewCount: reviews.length,
    submitReview,
    deleteReview,
    refetch: fetchReviews,
  };
}

/**
 * Hook to fetch average ratings for multiple rooms.
 * Useful for displaying ratings in room cards.
 */
export function useRoomRatings(roomIds = []) {
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomIds.length || !supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRatings() {
      setLoading(true);

      const { data, error } = await supabase
        .from(REVIEWS_TABLE)
        .select("room_id, rating")
        .in("room_id", roomIds);

      if (cancelled) return;

      if (error) {
        console.error("Error fetching room ratings:", error);
        setRatings({});
      } else {
        // Calculate average rating per room
        const ratingsMap = {};
        const counts = {};

        (data || []).forEach((review) => {
          if (!ratingsMap[review.room_id]) {
            ratingsMap[review.room_id] = 0;
            counts[review.room_id] = 0;
          }
          ratingsMap[review.room_id] += review.rating;
          counts[review.room_id]++;
        });

        // Calculate averages
        Object.keys(ratingsMap).forEach((roomId) => {
          ratingsMap[roomId] = {
            average: ratingsMap[roomId] / counts[roomId],
            count: counts[roomId],
          };
        });

        setRatings(ratingsMap);
      }

      setLoading(false);
    }

    fetchRatings();

    return () => {
      cancelled = true;
    };
  }, [roomIds.join(",")]);

  return { ratings, loading };
}

export default useReviews;
