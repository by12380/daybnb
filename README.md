# Daybnb

A full-stack daytime room and space booking platform. Guests can discover, search, and book rooms by the hour. Property owners manage their listings, bookings, and customers through a dedicated dashboard. Admins oversee the entire platform including users, rooms, offers, and messaging.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Routes](#api-routes)
- [Database Schema](#database-schema)
- [Supabase Edge Functions](#supabase-edge-functions)
- [Internationalization](#internationalization)
- [Additional Setup Guides](#additional-setup-guides)

---

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 | UI library |
| Vite 5 | Build tool and dev server |
| Redux Toolkit | Global state management |
| React Router v6 | Client-side routing |
| Ant Design 5 | UI component library |
| Tailwind CSS 3 | Utility-first styling |
| Algolia (react-instantsearch) | Full-text and geo-based search |
| Stripe (react-stripe-js) | Payment UI components |
| Socket.IO Client | Real-time communication |
| react-i18next | Multi-language support (15 languages) |
| Day.js | Date/time manipulation |
| Axios | HTTP client |

### Backend

| Technology | Purpose |
|---|---|
| Node.js (>=18) | Runtime |
| Express.js 4 | HTTP server and REST API |
| Supabase JS Client | Database access and auth verification |
| Stripe SDK | Payment processing (server-side) |
| Socket.IO | Real-time WebSocket server |
| Nodemailer | Transactional email |
| Morgan | HTTP request logging |

### Infrastructure

| Technology | Purpose |
|---|---|
| Supabase | PostgreSQL database, authentication, Row Level Security, Edge Functions |
| Algolia | Search indexing with GeoSearch |
| Stripe | Payment gateway (Checkout Sessions, Webhooks) |

---

## Project Structure

```
daybnb/
├── frontend/                   # React SPA (Vite)
│   ├── src/
│   │   ├── App.jsx             # Root component (Theme → Auth → Socket → Router)
│   │   ├── main.jsx            # Entry point (Redux Provider, Ant Design, i18n)
│   │   │
│   │   ├── routes/
│   │   │   └── AppRouter.jsx   # All route definitions with role-based guards
│   │   │
│   │   ├── auth/               # Authentication layer
│   │   │   ├── AuthProvider.jsx      # Supabase auth state context
│   │   │   ├── useAuth.js            # Auth context hook
│   │   │   ├── useProfile.js         # User profile fetching hook
│   │   │   ├── RequireAuth.jsx       # Route guard — logged-in users
│   │   │   ├── RequireAdmin.jsx      # Route guard — admin role
│   │   │   └── RequireOwner.jsx      # Route guard — owner role
│   │   │
│   │   ├── guest/              # Guest-facing module
│   │   │   ├── components/
│   │   │   │   ├── layout/           # Navbar, Footer, GuestLayout
│   │   │   │   ├── search/           # GeoSearch, SearchFilters, SearchResults
│   │   │   │   ├── ui/              # Badge, Button, Card, FormInput, Pagination, Stars
│   │   │   │   ├── RoomCard.jsx
│   │   │   │   ├── ChatWidget.jsx
│   │   │   │   ├── CampaignBanner.jsx
│   │   │   │   ├── WelcomeOfferBanner.jsx
│   │   │   │   ├── AvailabilityCalendar.jsx
│   │   │   │   └── NotificationDropdown.jsx
│   │   │   ├── pages/
│   │   │   │   ├── Landing.jsx       # Home page with search, gallery, CTA
│   │   │   │   ├── Booking.jsx       # Room detail + booking form + payment
│   │   │   │   ├── MyBookings.jsx    # Booking history and management
│   │   │   │   ├── LikedRooms.jsx    # Saved/favorited rooms
│   │   │   │   ├── Profile.jsx       # User profile management
│   │   │   │   ├── ContactUs.jsx     # Contact form
│   │   │   │   ├── PaymentSuccess.jsx
│   │   │   │   └── PaymentCancel.jsx
│   │   │   ├── sections/             # Landing page sections (Hero, Gallery, etc.)
│   │   │   ├── hooks/                # Guest-specific hooks (pagination, preferences)
│   │   │   ├── utils/                # Offer calculations, formatting, room helpers
│   │   │   └── data/                 # Static room data / seed data
│   │   │
│   │   ├── admin/              # Admin dashboard module
│   │   │   ├── components/
│   │   │   │   ├── layout/           # AdminLayout (sidebar + header)
│   │   │   │   └── NotificationDropdown.jsx
│   │   │   └── pages/
│   │   │       ├── Dashboard.jsx     # Analytics overview
│   │   │       ├── Users.jsx         # User management
│   │   │       ├── Rooms.jsx         # Room moderation
│   │   │       ├── Bookings.jsx      # All bookings
│   │   │       ├── Owners.jsx        # Owner management
│   │   │       ├── Offers.jsx        # Site-wide offer management
│   │   │       ├── Messages.jsx      # Contact form submissions
│   │   │       └── Chat.jsx          # Admin chat interface
│   │   │
│   │   ├── owner/              # Owner dashboard module
│   │   │   ├── components/
│   │   │   │   ├── layout/           # OwnerLayout (sidebar + header)
│   │   │   │   └── NotificationDropdown.jsx
│   │   │   └── pages/
│   │   │       ├── Dashboard.jsx     # Owner analytics
│   │   │       ├── Rooms.jsx         # Room CRUD
│   │   │       ├── Bookings.jsx      # Owner's bookings
│   │   │       ├── Customers.jsx     # Customer list
│   │   │       ├── Offers.jsx        # Room-level offers
│   │   │       └── Chat.jsx          # Owner chat interface
│   │   │
│   │   ├── redux/              # Redux Toolkit store
│   │   │   ├── store.js              # Store configuration
│   │   │   ├── api.js                # Axios instance with auth interceptor
│   │   │   └── slices/
│   │   │       ├── authSlice.js
│   │   │       ├── roomSlice.js
│   │   │       ├── bookingSlice.js
│   │   │       ├── reviewSlice.js
│   │   │       ├── notificationSlice.js
│   │   │       ├── contactSlice.js
│   │   │       ├── userSlice.js
│   │   │       ├── stripeSlice.js
│   │   │       ├── ownerSlice.js
│   │   │       ├── chatSlice.js
│   │   │       └── offerSlice.js
│   │   │
│   │   ├── lib/                # Third-party client setup
│   │   │   ├── supabaseClient.js     # Supabase browser client
│   │   │   ├── algoliaClient.js      # Algolia search client
│   │   │   ├── algoliaSync.js        # Algolia index sync utilities
│   │   │   ├── stripe.js             # Stripe loadStripe helper
│   │   │   ├── socket.js             # Socket.IO connection
│   │   │   ├── socketClient.js       # Socket.IO event helpers
│   │   │   └── SocketProvider.jsx    # Socket context provider
│   │   │
│   │   ├── hooks/              # Shared custom hooks
│   │   │   ├── useNotifications.js
│   │   │   ├── useWelcomeOffer.js
│   │   │   └── useCampaignBanner.js
│   │   │
│   │   ├── i18n/               # Internationalization
│   │   │   ├── index.js              # i18next configuration
│   │   │   └── locales/              # 15 language JSON files
│   │   │
│   │   ├── theme/              # Theming (dark/light mode)
│   │   │   ├── ThemeProvider.jsx
│   │   │   └── ThemeToggle.jsx
│   │   │
│   │   ├── components/         # Shared UI components
│   │   │   ├── LanguageSelector.jsx
│   │   │   └── Navbar.jsx
│   │   │
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx
│   │   │
│   │   ├── pages/              # Shared pages
│   │   │   ├── Auth.jsx              # Login / Sign-up page
│   │   │   └── Dashboard.jsx         # Host landing page
│   │   │
│   │   └── styles/
│   │       └── index.css             # Global styles + Tailwind directives
│   │
│   └── package.json
│
├── backend/                    # Express.js API server
│   ├── server.js               # HTTP server + Socket.IO bootstrap
│   ├── src/
│   │   ├── app.js              # Express app (CORS, body parsing, routes)
│   │   │
│   │   ├── config/
│   │   │   ├── supabase.js           # Supabase admin + anon clients
│   │   │   └── stripe.js             # Stripe SDK initialization
│   │   │
│   │   ├── controllers/        # Request handlers
│   │   │   ├── authController.js
│   │   │   ├── roomController.js
│   │   │   ├── bookingController.js
│   │   │   ├── userController.js
│   │   │   ├── reviewController.js
│   │   │   ├── notificationController.js
│   │   │   ├── contactController.js
│   │   │   ├── stripeController.js
│   │   │   ├── likesController.js
│   │   │   ├── adminController.js
│   │   │   ├── ownerController.js
│   │   │   ├── chatController.js
│   │   │   └── offerController.js
│   │   │
│   │   ├── routes/             # Route definitions
│   │   │   ├── index.js              # Route aggregator (mounts all sub-routers)
│   │   │   ├── auth.js
│   │   │   ├── rooms.js
│   │   │   ├── bookings.js
│   │   │   ├── users.js
│   │   │   ├── reviews.js
│   │   │   ├── notifications.js
│   │   │   ├── contact.js
│   │   │   ├── stripe.js
│   │   │   ├── likes.js
│   │   │   ├── admin.js
│   │   │   ├── owner.js
│   │   │   ├── chat.js
│   │   │   └── offers.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verification via Supabase
│   │   │   ├── admin.js              # Admin-only middleware
│   │   │   ├── rbac.js               # Role-based access control (admin/owner/customer)
│   │   │   ├── impersonate.js        # Admin user impersonation
│   │   │   └── errorHandler.js       # Global error handler
│   │   │
│   │   ├── socket/
│   │   │   └── index.js              # Socket.IO event handlers (chat, notifications)
│   │   │
│   │   └── utils/
│   │       ├── ApiError.js           # Custom error class with HTTP status codes
│   │       └── asyncHandler.js       # Async route handler wrapper
│   │
│   └── package.json
│
├── supabase/                   # Supabase configuration and serverless functions
│   ├── functions/
│   │   ├── create-checkout-session/  # Creates Stripe Checkout sessions
│   │   ├── stripe-webhook/           # Handles Stripe payment webhooks
│   │   ├── sync-algolia/             # Syncs rooms data to Algolia index
│   │   └── sync-bookings/            # Syncs bookings data to Algolia index
│   ├── migrations/
│   │   └── 20260217_create_offers_table.sql
│   └── offers_schema.sql             # Offer columns on rooms + campaign table
│
├── ALGOLIA_SETUP.md            # Algolia GeoSearch integration guide
├── STRIPE_SETUP.md             # Stripe payment integration guide
└── .gitignore
```

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                        │
│                                                                   │
│   React 18 + Vite ─── Redux Toolkit ─── React Router v6          │
│   Ant Design + Tailwind CSS                                       │
│   Algolia InstantSearch        Stripe Checkout (redirect)         │
│   Socket.IO Client             i18next (15 languages)             │
└──────────┬──────────────────────────┬────────────────────────────┘
           │ REST (Axios)             │ WebSocket
           ▼                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (Express.js)                         │
│                                                                   │
│   REST API (/api/*)            Socket.IO Server                   │
│   JWT Auth Middleware           Real-time chat & notifications     │
│   RBAC (admin/owner/customer)  Nodemailer (email)                 │
└──────────┬──────────────────────────┬────────────────────────────┘
           │                          │
           ▼                          ▼
┌────────────────────┐    ┌────────────────────────────────────────┐
│     Supabase       │    │          Third-Party Services          │
│                    │    │                                        │
│  PostgreSQL DB     │    │  Stripe ── Payments & Webhooks         │
│  Auth (JWT)        │    │  Algolia ── Search & GeoSearch         │
│  Row Level Security│    │  Nodemailer ── Transactional Email     │
│  Edge Functions    │    │                                        │
│  Storage           │    │                                        │
└────────────────────┘    └────────────────────────────────────────┘
```

### Request Flow

1. The frontend makes authenticated requests through an Axios instance that automatically attaches the Supabase JWT token.
2. The backend `auth` middleware verifies the token against Supabase and attaches user data to the request.
3. The `rbac` middleware fetches the user's role from the `profiles` table and enforces access control.
4. Controllers interact with Supabase (database) and third-party services (Stripe, Algolia) as needed.
5. Real-time events (chat messages, notifications) flow through Socket.IO.

### User Roles

| Role | Access |
|---|---|
| **customer** | Browse rooms, book, pay, review, chat, manage profile |
| **owner** | Everything a customer can do + manage own rooms, bookings, offers, and customers |
| **admin** | Full platform access — manage all users, rooms, bookings, owners, offers, messages |

---

## Features

### Guest / Customer

- **Room Discovery** — Browse rooms with Algolia-powered full-text search and geo-location filtering. Filter by date, time range, price, room type, and guest capacity.
- **GeoSearch** — "Use my location" button for proximity-based results with configurable radius (5km–200km).
- **Room Booking** — Select dates and time slots, view availability calendar, and book rooms by the hour.
- **Stripe Payments** — Secure checkout via Stripe Checkout Sessions with success/cancel redirect pages.
- **Reviews & Ratings** — Leave star ratings and written reviews for booked rooms.
- **Favorites** — Like/save rooms for quick access later.
- **Real-time Chat** — Socket.IO-powered live chat with room owners.
- **Notifications** — In-app notification dropdown with real-time updates.
- **Offers & Discounts** — View active room-level discounts, campaign banners, and welcome offers.
- **Profile Management** — Edit personal information and view booking history.
- **Contact Form** — Submit inquiries through a dedicated contact page.

### Owner Dashboard (`/owner/*`)

- **Dashboard** — Overview of room performance and booking analytics.
- **Room Management** — Create, edit, and delete room listings.
- **Booking Management** — View and manage incoming bookings.
- **Customer Management** — View customers who have booked rooms.
- **Offers** — Create and manage room-level discounts and promotions.
- **Chat** — Communicate with guests in real time.

### Admin Dashboard (`/admin/*`)

- **Dashboard** — Platform-wide analytics and statistics.
- **User Management** — View, edit, and manage all registered users.
- **Room Moderation** — Oversee all room listings across the platform.
- **Booking Oversight** — Monitor all bookings and payment statuses.
- **Owner Management** — Manage property owner accounts and approvals.
- **Offer Management** — Create site-wide offers and campaign banners.
- **Messages** — View and respond to contact form submissions.
- **Chat** — Platform-level chat interface.
- **User Impersonation** — Admin middleware for debugging user-specific issues.

### Cross-cutting

- **Internationalization** — 15 languages: Arabic, Chinese, Dutch, English, French, German, Hindi, Italian, Japanese, Korean, Portuguese, Russian, Spanish, Thai, and Turkish.
- **Dark / Light Theme** — Toggle between dark and light modes with persisted preference.
- **Role-based Route Guards** — `RequireAuth`, `RequireAdmin`, and `RequireOwner` protect frontend routes.
- **RBAC Middleware** — Server-side role enforcement on all protected API endpoints.

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** (comes with Node.js)
- A **Supabase** project ([supabase.com](https://supabase.com))
- A **Stripe** account ([stripe.com](https://stripe.com)) — test keys are fine for development
- An **Algolia** account ([algolia.com](https://www.algolia.com)) — free tier available

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd daybnb

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### Running Locally

Start the backend and frontend in separate terminal windows:

```bash
# Terminal 1 — Backend API (runs on http://localhost:5000)
cd backend
npm run dev

# Terminal 2 — Frontend dev server (runs on http://localhost:5173)
cd frontend
npm run dev
```

The frontend Vite dev server proxies API calls to the backend. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Database Setup

1. Create a Supabase project and note your project URL, anon key, and service role key.
2. Run the migration SQL in the Supabase SQL Editor:
   - `supabase/migrations/20260217_create_offers_table.sql` — Creates the offers table.
   - `supabase/offers_schema.sql` — Adds offer columns to rooms and creates the campaign banner table.
3. Deploy Supabase Edge Functions (see [Supabase Edge Functions](#supabase-edge-functions)).

---

## Environment Variables

### Frontend (`frontend/.env`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

VITE_ALGOLIA_APP_ID=your_algolia_app_id
VITE_ALGOLIA_SEARCH_KEY=your_algolia_search_only_key
VITE_ALGOLIA_INDEX_NAME=daybnb_places
```

### Backend (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Supabase Edge Functions (set via CLI)

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set ALGOLIA_APP_ID=your_algolia_app_id
supabase secrets set ALGOLIA_ADMIN_KEY=your_algolia_admin_key
supabase secrets set ALGOLIA_INDEX_NAME=daybnb_places
supabase secrets set ALGOLIA_BOOKINGS_INDEX_NAME=daybnb_bookings
```

---

## Available Scripts

### Frontend (`frontend/`)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server on port 5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |

### Backend (`backend/`)

| Command | Description |
|---|---|
| `npm run dev` | Start server with `--watch` for auto-restart |
| `npm start` | Start server in production mode |

---

## API Routes

All routes are prefixed with `/api`. Protected routes require a valid Supabase JWT in the `Authorization: Bearer <token>` header.

| Prefix | Description | Auth |
|---|---|---|
| `/api/health` | Health check endpoint | Public |
| `/api/auth` | Sign-up, login, session management | Public |
| `/api/rooms` | Room listing and details | Public (read), Auth (write) |
| `/api/bookings` | Create and manage bookings | Auth |
| `/api/users` | User profile operations | Auth |
| `/api/reviews` | Room reviews and ratings | Auth |
| `/api/notifications` | In-app notifications | Auth |
| `/api/contact` | Contact form submissions | Public |
| `/api/stripe` | Checkout sessions and webhooks | Auth / Webhook |
| `/api/likes` | Room like/unlike | Auth |
| `/api/chat` | Chat message operations | Auth |
| `/api/offers` | Offers and campaign banners | Public (read), Auth (write) |
| `/api/admin` | Admin-only operations (users, rooms, stats) | Admin |
| `/api/owner` | Owner-specific operations (rooms, bookings, customers) | Owner |

---

## Database Schema

The application uses Supabase (PostgreSQL) with the following core tables:

| Table | Description |
|---|---|
| `profiles` | User profiles linked to Supabase Auth, includes `user_type` (admin/owner/customer) |
| `rooms` | Room listings with location, pricing, images, capacity, and offer fields |
| `bookings` | Booking records with dates, time slots, payment status, and Stripe references |
| `reviews` | Star ratings and text reviews tied to rooms and users |
| `offers` | Discount/promotion definitions with scoping (room-level, owner-level, or site-wide) |
| `special_offer_campaigns` | Landing page campaign banners managed by admins |
| `notifications` | In-app notification records |
| `messages` / `chats` | Real-time chat message storage |

Row Level Security (RLS) is enabled on sensitive tables. The backend uses the Supabase service role key for admin operations that bypass RLS.

---

## Supabase Edge Functions

Deployed via the Supabase CLI (`supabase functions deploy <function-name>`):

| Function | Purpose |
|---|---|
| `create-checkout-session` | Creates a Stripe Checkout Session for a booking |
| `stripe-webhook` | Receives Stripe webhook events and updates booking payment status |
| `sync-algolia` | Syncs room data from Supabase to the Algolia search index |
| `sync-bookings` | Syncs booking data to a separate Algolia index |

---

## Internationalization

The app supports 15 languages via `react-i18next` with automatic browser language detection:

| Code | Language | Code | Language | Code | Language |
|---|---|---|---|---|---|
| `en` | English | `fr` | French | `de` | German |
| `es` | Spanish | `pt` | Portuguese | `it` | Italian |
| `nl` | Dutch | `ru` | Russian | `ar` | Arabic |
| `hi` | Hindi | `ja` | Japanese | `ko` | Korean |
| `zh` | Chinese | `th` | Thai | `tr` | Turkish |

Translation files are located in `frontend/src/i18n/locales/`. A `LanguageSelector` component is available in the UI for manual switching.

---

## Additional Setup Guides

- **[ALGOLIA_SETUP.md](./ALGOLIA_SETUP.md)** — Step-by-step guide for configuring Algolia GeoSearch, index settings, database webhooks, and troubleshooting.
- **[STRIPE_SETUP.md](./STRIPE_SETUP.md)** — Step-by-step guide for setting up Stripe payments, webhooks, test cards, and going live.
