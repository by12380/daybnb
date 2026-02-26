import React, { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { fetchBookingById, clearSelectedBooking } from "../../redux/slices/bookingSlice.js";
import {
  verifyCheckoutSession,
  clearStripeError,
} from "../../redux/slices/stripeSlice.js";

const PaymentSuccess = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const sessionId = searchParams.get("session_id");

  const { selectedBooking: booking, loading, error } = useSelector(
    (state) => state.bookings
  );
  const { error: stripeError } = useSelector((state) => state.stripe);

  useEffect(() => {
    let isMounted = true;

    const confirmPaymentAndFetch = async () => {
      if (!bookingId) return;

      // Fallback confirmation: ensures booking status updates even if webhook is delayed.
      if (sessionId) {
        try {
          await dispatch(
            verifyCheckoutSession({ sessionId, bookingId })
          ).unwrap();
        } catch (_err) {
          // We still fetch booking data below and show any error from store.
        }
      }

      if (isMounted) {
        dispatch(fetchBookingById(bookingId));
      }
    };

    confirmPaymentAndFetch();

    return () => {
      isMounted = false;
      dispatch(clearStripeError());
      dispatch(clearSelectedBooking());
    };
  }, [dispatch, bookingId, sessionId]);

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
          <svg className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-bold text-ink dark:text-dark-ink">Payment Successful!</h1>
        <p className="mt-2 text-muted dark:text-dark-muted">Your booking has been confirmed and payment received.</p>

        {booking && (
          <div className="mt-6 rounded-xl border border-border bg-surface/50 p-4 text-left dark:border-dark-border dark:bg-dark-surface/50">
            <p className="text-sm font-semibold text-ink dark:text-dark-ink">Booking Details</p>
            <div className="mt-3 space-y-2 text-sm">
              {booking.booking_date && (
                <div className="flex justify-between">
                  <span className="text-muted dark:text-dark-muted">Date</span>
                  <span className="font-medium text-ink dark:text-dark-ink">
                    {new Date(booking.booking_date).toLocaleDateString()}
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

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {stripeError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{stripeError}</p>}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/my-bookings"><Button className="w-full sm:w-auto">View My Bookings</Button></Link>
          <Link to="/"><Button variant="outline" className="w-full sm:w-auto">Back to Home</Button></Link>
        </div>

        <p className="mt-6 text-xs text-muted dark:text-dark-muted">
          A confirmation email has been sent to your registered email address.
        </p>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
