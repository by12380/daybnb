# Stripe Payment Integration Setup

This guide will help you set up Stripe payments for DayBnB.

## Prerequisites

- A Stripe account (create one at https://stripe.com)
- Supabase CLI installed (`npm install -g supabase`)
- Your Supabase project linked

## Step 1: Get Your Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)

> ⚠️ Use **test keys** during development. Switch to **live keys** only in production.

## Step 2: Configure Environment Variables

### Frontend (.env file)

Create or update your `.env` file in the project root:

```env
# Existing Supabase config
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Add Stripe publishable key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

### Supabase Edge Functions (Secrets)

Set the Stripe secret key as a Supabase secret:

```bash
# Login to Supabase CLI
supabase login

# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Set Stripe secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key_here
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Step 3: Deploy Supabase Edge Functions

Deploy the checkout and webhook functions:

```bash
# Deploy the checkout session function
supabase functions deploy create-checkout-session

# Deploy the webhook handler function
supabase functions deploy stripe-webhook
```

## Step 4: Set Up Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://your-project-ref.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Update your Supabase secret:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_signing_secret
   ```

## Step 5: Update Database Schema

Add these columns to your `bookings` table in Supabase:

```sql
-- Add payment-related columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session ON bookings(stripe_session_id);
```

### Payment Status Values

- `pending` - Booking created, payment not yet attempted
- `paid` - Payment successful
- `expired` - Checkout session expired without payment
- `failed` - Payment failed

## Step 6: Test the Integration

### Using Stripe Test Cards

Use these test card numbers in Stripe's test mode:

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |

Use any future expiry date and any 3-digit CVC.

### Testing Flow

1. Start your dev server: `npm run dev`
2. Select a room and fill in booking details
3. Click "Pay & Book"
4. You'll be redirected to Stripe Checkout
5. Use a test card to complete payment
6. You'll be redirected to the success page

## Troubleshooting

### "Stripe not initialized" Error

- Check that `VITE_STRIPE_PUBLISHABLE_KEY` is set in your `.env` file
- Restart your dev server after adding environment variables

### "Failed to create checkout session" Error

- Verify your Supabase Edge Function is deployed
- Check that `STRIPE_SECRET_KEY` is set in Supabase secrets
- Check the Edge Function logs in Supabase dashboard

### Webhook Not Updating Bookings

- Verify the webhook URL is correct
- Check that `STRIPE_WEBHOOK_SECRET` matches your Stripe dashboard
- Check Edge Function logs for errors
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is available to the function

### CORS Errors

The Edge Functions include CORS headers. If you still see CORS errors:
- Check that your frontend origin is allowed
- Verify the function is deployed correctly

## Going Live

When ready for production:

1. Switch to Stripe live keys in your environment
2. Update the webhook endpoint to use live mode
3. Test with a real card (small amount)
4. Monitor the Stripe dashboard for successful payments

## Files Created

- `src/lib/stripe.js` - Stripe client utilities
- `src/guest/pages/PaymentSuccess.jsx` - Success page after payment
- `src/guest/pages/PaymentCancel.jsx` - Cancel/retry page
- `supabase/functions/create-checkout-session/index.ts` - Creates Stripe checkout
- `supabase/functions/stripe-webhook/index.ts` - Handles Stripe webhooks

## Support

- Stripe Documentation: https://stripe.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
