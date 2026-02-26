# Stripe Sandbox Setup (Local Development)

This project currently creates checkout sessions through the backend API (`/api/stripe/create-checkout-session`) from the booking page.  
Use this guide to run Stripe in test mode end-to-end on localhost.

## 1) Get Stripe test keys

1. Open https://dashboard.stripe.com/test/apikeys
2. Copy:
   - Publishable key (`pk_test_...`)
   - Secret key (`sk_test_...`)

Use test keys only for sandbox/dev.

## 2) Configure local env files

Create or update these files:

### `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

### `backend/.env`

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

STRIPE_SECRET_KEY=sk_test_your_secret_key
# Set this after you start `stripe listen` in step 4
STRIPE_WEBHOOK_SECRET=whsec_from_stripe_cli
```

## 3) Ensure booking table has payment fields

Run this once in Supabase SQL editor:

```sql
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session ON bookings(stripe_session_id);
```

## 4) Run webhook forwarding in local sandbox

Install Stripe CLI and login:

```bash
stripe login
```

Forward Stripe webhooks to your local backend:

```bash
stripe listen --events checkout.session.completed,checkout.session.expired,payment_intent.payment_failed --forward-to http://localhost:5000/api/stripe/webhook
```

Copy the `whsec_...` shown in the CLI output and set it in `backend/.env` as `STRIPE_WEBHOOK_SECRET`.

If backend is already running, restart it after editing env.

## 5) Run the app

In two terminals:

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

## 6) Test payments in sandbox

1. Sign in as a normal user.
2. Open a room and create a booking with payment method `Pay Online`.
3. You should be redirected to Stripe Checkout.
4. Use a test card:

| Card Number | Expected Result |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |

Use any future expiry date, any 3-digit CVC, any ZIP.

5. After success:
   - You return to `/payment-success`
   - Backend webhook marks booking as paid (`payment_status = paid`, `status = confirmed`)

## 7) Verify webhook + booking updates

- Stripe CLI terminal should show `checkout.session.completed` delivered with HTTP `200`.
- In Supabase `bookings` table, verify:
  - `payment_status = paid`
  - `stripe_session_id` is filled
  - `stripe_payment_intent_id` is filled
  - `paid_at` is filled

## Common issues

### "Stripe is not configured"
- Check `STRIPE_SECRET_KEY` in `backend/.env`.
- Restart backend after changing env.

### "Stripe not initialized" in frontend
- Check `VITE_STRIPE_PUBLISHABLE_KEY` in `frontend/.env`.
- Restart frontend after changing env.

### Payment succeeds but booking stays pending
- `STRIPE_WEBHOOK_SECRET` is incorrect or missing.
- `stripe listen` is not running.
- Backend not reachable at `http://localhost:5000`.

## Optional: Supabase Edge Function mode

This repo also includes `supabase/functions/create-checkout-session` and `supabase/functions/stripe-webhook`.  
If you choose that route, set Stripe secrets with `supabase secrets set ...` and deploy the functions.  
For the current booking UI flow, backend mode is the active path.
