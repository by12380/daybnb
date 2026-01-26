import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { supabase } from "../../lib/supabaseClient.js";

export default function PaymentCancel() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function cleanup() {
      setError("");

      if (!bookingId) {
        setLoading(false);
        return;
      }

      if (!supabase) {
        setError(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        );
        setLoading(false);
        return;
      }

      try {
        const { error: deleteError } = await supabase
          .from("bookings")
          .delete()
          .eq("id", bookingId);

        if (cancelled) return;

        if (deleteError) {
          setError(deleteError.message || "Failed to clean up cancelled booking.");
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to clean up cancelled booking.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    cleanup();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  return (
    <Card>
      <p className="text-sm font-semibold text-ink dark:text-dark-ink">Payment cancelled</p>
      <p className="mt-1 text-sm text-muted dark:text-dark-muted">
        Your payment was cancelled. No charges were made.
      </p>
      {loading ? (
        <p className="mt-3 text-xs text-muted dark:text-dark-muted">Cleaning up…</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="mt-4 flex gap-3">
        <Link to="/">
          <Button>Back to home</Button>
        </Link>
        <Link to="/my-bookings">
          <Button variant="outline">My Bookings</Button>
        </Link>
      </div>
    </Card>
  );
}
