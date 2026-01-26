import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { supabase } from "../../lib/supabaseClient.js";

const PaymentCancel = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get("booking_id");
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooking() {
      if (!bookingId || !supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("bookings")
          .select("*, rooms(id, title)")
          .eq("id", bookingId)
          .maybeSingle();

        setBooking(data);
      } catch (err) {
        console.error("Error fetching booking:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [bookingId]);

  const handleRetryPayment = () => {
    if (booking?.rooms?.id) {
      navigate(`/book/${booking.rooms.id}?retry=${bookingId}`);
    } else {
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <div className="animate-pulse">
            <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800"></div>
            <p className="mt-4 text-muted">Loading...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="max-w-lg text-center">
        {/* Cancel Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <svg
            className="h-10 w-10 text-amber-600 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-bold text-ink dark:text-dark-ink">
          Payment Cancelled
        </h1>
        
        <p className="mt-2 text-muted dark:text-dark-muted">
          Your payment was not completed. Don't worry, your booking is saved and you can try again.
        </p>

        {booking && (
          <div className="mt-6 rounded-xl border border-border bg-surface/50 p-4 text-left dark:border-dark-border dark:bg-dark-surface/50">
            <p className="text-sm font-semibold text-ink dark:text-dark-ink">
              Pending Booking
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
              <div className="flex justify-between border-t border-border pt-2 dark:border-dark-border">
                <span className="text-muted dark:text-dark-muted">Status</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  Payment Pending
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={handleRetryPayment} className="w-full sm:w-auto">
            Try Payment Again
          </Button>
          <Link to="/my-bookings">
            <Button variant="outline" className="w-full sm:w-auto">
              View My Bookings
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted dark:text-dark-muted">
          Need help? Contact our support team for assistance.
        </p>
      </Card>
    </div>
  );
};

export default PaymentCancel;
