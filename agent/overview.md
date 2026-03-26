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
| Carousel | react-slick (used for hero banner slider on landing page) |
| AI Chat | OpenAI GPT-4o-mini (via `openai` Node.js SDK on backend) |

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
- `CHAT_ATTACHMENTS_BUCKET` — optional Supabase Storage bucket for chat uploads (defaults to `chat-attachments`)
- `OPENAI_API_KEY` — optional OpenAI API key for AI chatbot
- `AI_CHAT_MODEL` — OpenAI model to use when OpenAI is selected (default: `gpt-4o-mini`)
- `GEMINI_API_KEY` — optional Google Gemini API key for AI chatbot fallback/free tier
- `GEMINI_MODEL` — Gemini model to use (default: `gemini-2.0-flash-lite`)
- `AI_CHAT_PROVIDER` — `auto`, `openai`, or `gemini` (default: `auto`)
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `ALGOLIA_APP_ID` — Algolia application ID (for server-side sync)
- `ALGOLIA_ADMIN_KEY` — Algolia admin API key (for server-side sync)
- `ALGOLIA_INDEX_NAME` — Algolia index name (default: `daybnb_places`)
- `ALGOLIA_SYNC_INTERVAL_MS` — Auto-sync interval in ms (default: 30 minutes)

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
├── supabase/          # DB migrations, seed data, edge functions, schema files
├── agent/             # AI agent reference docs (this folder)
├── .gitignore
├── package.json       # Root-level package.json (workspace-level)
├── package-lock.json
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
- Backend has a server-side Algolia sync utility (`backend/src/utils/algoliaSync.js`) that uses the Algolia REST API directly (no SDK). Supports full-sync, per-record upsert/delete, index configuration, and optional auto-sync on an interval.
- Shared UI components live in `frontend/src/components/ui/` (Button, PageHeader). Both admin and owner panels import from this shared location. Legacy re-exports exist at `guest/components/ui/Button.jsx` and `admin/components/AdminPageHeader.jsx` for backward compatibility.

## Key Features Summary

| Feature | Description |
|---------|-------------|
| Hero Banners | Admin-managed landing page slider with per-device (desktop/tablet/mobile) text box positioning, drag-to-reposition in editor, background types (image/solid/gradient), live preview. Stored in `hero_banners` table. If no active banners exist, a default static hero is rendered. |
| Room Detail Page | Public page at `/room/:roomId` showing full room details, amenities, reviews, offer pricing, and booking CTA. |
| Offers & Campaigns | Discount system with room-specific, owner-level, and site-wide scopes. Includes campaign banners and welcome offer banners on the landing page. |
| Chat | Real-time two-party chat via Socket.IO + REST API, now with emoji picker support and optional file/image uploads. Available to customers, owners, and admins. |
| AI Chatbot | OpenAI-powered AI assistant on guest pages. Context-aware: fetches rooms, user bookings, and active offers to provide accurate answers. Supports streaming responses (SSE). Works for both authenticated users and email-gated guests. Conversations stored in localStorage; session metadata tracked in `ai_chat_sessions` table. |
| Check-In/Out | Admin and owner can check in/out guests for today's bookings. Status flow: confirmed → checked_in → checked_out. |
| Booking History | 4-tab history page (No-show, Completed, Rejected, Cancelled by Guest) in both admin and owner panels. No-show auto-detected for past bookings never checked in or never reviewed. Cancellation is soft-delete (status="cancelled"). |
| Algolia Search | Client-side `react-instantsearch` with geo-search support. Server-side sync from Supabase to Algolia via admin trigger or auto-interval. |
| Find a Host | Public host directory at `/hosts` with search/filter. Pulls real owner profiles from the database with aggregated ratings/reviews from their rooms. Individual host profile pages at `/hosts/:hostId` show bio, listings, reviews, co-hosts, and host details. |
| Host Profile (Owner) | Owners can edit their public host profile from the Owner Panel (`/owner/host-profile`): bio, avatar, cover photo, languages, specialties, response time/rate, superhost badge, identity verification, co-hosting availability. |
| Co-hosts | Owner-to-owner co-hosting system. Owners invite other owners by email, invitees accept/reject. Primary host manages granular permissions (view/manage bookings, rooms, customers, check-in). Managed at `/owner/co-hosts`. Co-host data stored in separate `co_hosts` table. |
