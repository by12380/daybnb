# Daybnb - Project Overview

## What It Is

Daybnb is a daytime room/space booking platform (like Airbnb but for day-use). Three user roles: **customer** (guest), **owner** (property host), **admin** (platform manager). Monorepo with `frontend/` and `backend/` directories.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5, JSX (no TypeScript) |
| State | Redux Toolkit (slices + createAsyncThunk) |
| UI | Tailwind CSS 3 + Ant Design 5 |
| Routing | react-router-dom v6 |
| Backend | Express.js (Node 18+, CommonJS `require`) |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Search | Algolia (react-instantsearch + algoliasearch lite) |
| Payments | Stripe (Checkout Sessions via Supabase Edge Functions + webhook) |
| Real-time | Socket.IO (server + client) |
| i18n | react-i18next (15 languages) |
| Theme | Dark/light mode via CSS variables + Tailwind `dark:` class |
| Animation | framer-motion |

## Running the Project

- **Frontend**: `cd frontend && npm run dev` → Vite on `http://localhost:5173`
- **Backend**: `cd backend && npm run dev` → Express on `http://localhost:5000` (uses `node --watch`)

## Environment Variables

### Frontend (`.env` in `frontend/`)
- `VITE_API_BASE_URL` — backend API URL (default: `http://localhost:5000/api`)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key
- `VITE_ALGOLIA_APP_ID` — Algolia application ID
- `VITE_ALGOLIA_SEARCH_KEY` — Algolia search-only API key
- `VITE_ALGOLIA_INDEX_NAME` — Algolia index (default: `daybnb_places`)
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key
- `VITE_SOCKET_URL` — Socket.IO URL (derived from API base URL if omitted)

### Backend (`.env` in `backend/`)
- `PORT` — server port (default: 5000)
- `NODE_ENV` — environment
- `CLIENT_URL` — frontend origin for CORS
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (bypasses RLS)
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret

## User Roles & Auth Flow

1. Auth via Supabase Auth (email/password). Frontend uses `AuthProvider` context wrapping the app.
2. On signup, a `profiles` row is created with `user_type` = `"customer"` or `"owner"`.
3. Role is stored in `profiles.user_type` column. Values: `"admin"`, `"owner"`, `"customer"`.
4. Backend verifies JWT via `supabase.auth.getUser(token)`, then fetches role from `profiles` table.
5. Admin can impersonate owners via `x-impersonate-owner` header.

## Route Protection

| Guard Component | Protects | Checks |
|-----------------|----------|--------|
| `RequireAuth` | `/book/*`, `/profile`, `/my-bookings`, etc. | session exists |
| `RequireAdmin` | `/admin/*` | session + `profiles.user_type === "admin"` |
| `RequireOwner` | `/owner/*` | session + `user_type === "owner"` OR admin impersonating |

## Project Root Structure

```
/
├── frontend/          # React SPA
├── backend/           # Express API server
├── supabase/          # DB migrations, seed data, edge functions
├── agent/             # AI agent reference docs (this folder)
├── .gitignore
├── README.md
├── ALGOLIA_SETUP.md
└── STRIPE_SETUP.md
```

## API Base Path

All backend API routes are prefixed with `/api`. Route index: `backend/src/routes/index.js`.

## Socket.IO Rooms

- `user:<userId>` — personal room for notifications/chat
- `role:admin` — all admin users
- `role:owner` — all owner users
- `chat:<conversationId>` — per-conversation room

## Key Architectural Patterns

- Frontend API calls go through `frontend/src/redux/api.js` (axios instance with auth interceptor).
- Redux slices use `createAsyncThunk` for all API calls.
- Backend controllers use `asyncHandler` wrapper to forward errors to global `errorHandler`.
- Custom `ApiError` class for structured HTTP errors (400, 401, 403, 404, 409, 500).
- Backend has two Supabase clients: `supabase` (respects RLS) and `supabaseAdmin` (bypasses RLS via service role key).
- Stripe checkout uses Supabase Edge Functions (`create-checkout-session`, `stripe-webhook`).
