import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { supabase } from "../../lib/supabaseClient.js";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function confirm() {
      setError("");

      if (!sessionId) {
        setError("Missing payment session id.");
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
        const { data, error: invokeError } = await supabase.functions.invoke(
          "confirm-checkout-session",
          {
            body: { sessionId },
          }
        );

        if (cancelled) return;

        if (invokeError) {
          setError(invokeError.message || "Failed to confirm payment.");
          setLoading(false);
          return;
        }

        const bookingId = data?.bookingId;
        if (bookingId) {
          navigate(`/my-bookings?highlight=${bookingId}&paid=1`, { replace: true });
          return;
        }

        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Failed to confirm payment.");
          setLoading(false);
        }
      }
    }

    confirm();
    return () => {
      cancelled = true;
    };
  }, [navigate, sessionId]);

  if (loading) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink dark:text-dark-ink">Confirming payment…</p>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Please wait while we verify your transaction.
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink dark:text-dark-ink">Payment confirmation failed</p>
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        <div className="mt-4 flex gap-3">
          <Link to="/my-bookings">
            <Button variant="outline">Go to My Bookings</Button>
          </Link>
          <Link to="/">
            <Button>Back to home</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm font-semibold text-ink dark:text-dark-ink">Payment received</p>
      <p className="mt-1 text-sm text-muted dark:text-dark-muted">
        Your payment was successful. You can view your booking in My Bookings.
      </p>
      <div className="mt-4">
        <Link to="/my-bookings">
          <Button>Go to My Bookings</Button>
        </Link>
      </div>
    </Card>
  );
}

