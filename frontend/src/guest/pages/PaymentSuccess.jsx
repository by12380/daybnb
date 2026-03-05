import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { fetchBookingById, clearSelectedBooking } from "../../redux/slices/bookingSlice.js";
import api from "../../redux/api.js";

const PaymentSuccess = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const bookingId = searchParams.get("booking_id");

  const { selectedBooking: booking, error } = useSelector(
    (state) => state.bookings
  );

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function verifyAndFetch() {
      setVerifying(true);
      try {
        if (sessionId) {
          const { data } = await api.post("/stripe/verify-session", {
            sessionId,
            bookingId,
          });
          if (!cancelled) {
            setVerified(data.verified);
            if (!data.verified) {
              setVerifyError("Payment could not be confirmed. Please check your bookings or try again.");
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setVerifyError("Could not verify payment status. Your payment may still be processing.");
        }
      }

      if (bookingId && !cancelled) {
        dispatch(fetchBookingById(bookingId));
      }

      if (!cancelled) setVerifying(false);
    }

    verifyAndFetch();

    return () => {
      cancelled = true;
      dispatch(clearSelectedBooking());
    };
  }, [dispatch, sessionId, bookingId]);

  if (verifying) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
              <svg className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-muted dark:text-dark-muted">Confirming your payment with Stripe...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="max-w-lg text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-bold text-ink dark:text-dark-ink">Payment Successful!</h1>
        <p className="mt-2 text-muted dark:text-dark-muted">Payment received. Your booking is pending approval from the owner or admin.</p>

        {verified && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Payment Verified
          </div>
        )}

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
              {booking.payment_status && (
                <div className="flex justify-between">
                  <span className="text-muted dark:text-dark-muted">Payment Status</span>
                  <span className={`font-medium ${booking.payment_status === "paid" ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}>
                    {booking.payment_status === "paid" ? "Paid" : "Pending"}
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

        {(error || verifyError) && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error || verifyError}</p>
        )}

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
