import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { supabase } from "../../lib/supabaseClient.js";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const sessionId = searchParams.get("session_id");
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBooking() {
      if (!bookingId || !supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("bookings")
          .select("*, rooms(title, location, image)")
          .eq("id", bookingId)
          .maybeSingle();

        if (fetchError) {
          setError(fetchError.message);
        } else {
          setBooking(data);
        }
      } catch (err) {
        setError(err.message || "Failed to fetch booking");
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <div className="animate-pulse">
            <div className="mx-auto h-16 w-16 rounded-full bg-brand-100 dark:bg-brand-900"></div>
            <p className="mt-4 text-muted">Confirming your payment...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="max-w-lg text-center">
        {/* Success Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg
            className="h-10 w-10 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-bold text-ink dark:text-dark-ink">
          Payment Successful!
        </h1>
        
        <p className="mt-2 text-muted dark:text-dark-muted">
          Your booking has been confirmed and payment received.
        </p>

        {booking && (
          <div className="mt-6 rounded-xl border border-border bg-surface/50 p-4 text-left dark:border-dark-border dark:bg-dark-surface/50">
            <p className="text-sm font-semibold text-ink dark:text-dark-ink">
              Booking Details
            </p>
            <div className="mt-3 space-y-2 text-sm">
              {booking.rooms?.title && (
                <div className="flex justify-between">
                  <span className="text-muted dark:text-dark-muted">Room</span>
                  <span className="font-medium text-ink dark:text-dark-ink">
                    {booking.rooms.title}
                  </span>
                </div>
              )}
              {booking.booking_date && (
                <div className="flex justify-between">
                  <span className="text-muted dark:text-dark-muted">Date</span>
                  <span className="font-medium text-ink dark:text-dark-ink">
                    {new Date(booking.booking_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {booking.start_time && booking.end_time && (
                <div className="flex justify-between">
                  <span className="text-muted dark:text-dark-muted">Time</span>
                  <span className="font-medium text-ink dark:text-dark-ink">
                    {booking.start_time} - {booking.end_time}
                  </span>
                </div>
              )}
              {booking.total_price && (
                <div className="flex justify-between border-t border-border pt-2 dark:border-dark-border">
                  <span className="font-semibold text-ink dark:text-dark-ink">Total Paid</span>
                  <span className="font-bold text-brand-700 dark:text-brand-400">
                    ${booking.total_price.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/my-bookings">
            <Button className="w-full sm:w-auto">View My Bookings</Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="w-full sm:w-auto">
              Back to Home
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted dark:text-dark-muted">
          A confirmation email has been sent to your registered email address.
        </p>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
