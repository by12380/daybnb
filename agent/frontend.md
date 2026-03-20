# Frontend Architecture

## Entry Point

`frontend/src/main.jsx` → mounts `<Provider store={store}><App /></Provider>`.

`frontend/src/App.jsx` → wraps `<ThemeProvider><AuthProvider><SocketProvider><AppRouter /></...>`.

## Provider Hierarchy (outermost → innermost)

1. `Redux Provider` (in `main.jsx`)
2. `ThemeProvider` — dark/light via `localStorage("daybnb-theme")`, toggles `html.dark` class
3. `AuthProvider` — Supabase auth context (session, user, signIn, signUp, signOut)
4. `SocketProvider` — Socket.IO client, connects when session exists

## Routing (`frontend/src/routes/AppRouter.jsx`)

```
/                                → Landing (GuestLayout)
/contact                         → ContactUs (GuestLayout)
/room/:roomId                    → RoomDetail (GuestLayout, public)
/auth                            → Auth (GuestLayout)
/book/:roomId                    → Booking (GuestLayout, RequireAuth)
/profile                         → Profile (GuestLayout, RequireAuth)
/my-bookings                     → MyBookings (GuestLayout, RequireAuth)
/liked-rooms                     → LikedRooms (GuestLayout, RequireAuth)
/payment-success                 → PaymentSuccess (GuestLayout, RequireAuth)
/payment-cancel                  → PaymentCancel (GuestLayout, RequireAuth)
/host                            → Dashboard (MainLayout)
/admin                           → AdminDashboard (AdminLayout, RequireAdmin)
/admin/bookings                  → AdminBookings
/admin/users                     → AdminUsers
/admin/rooms                     → AdminRooms
/admin/messages                  → AdminMessages
/admin/chat                      → AdminChat
/admin/owners                    → AdminOwners
/admin/offers                    → AdminOffers
/admin/hero-banners              → AdminHeroBanners
/admin/hero-banners/new          → AdminHeroBannerEditor (create mode)
/admin/hero-banners/:bannerId/edit → AdminHeroBannerEditor (edit mode)
/admin/check-in-out              → AdminCheckInOut
/admin/booking-history           → AdminBookingHistory
/admin/algolia                   → AdminAlgoliaSync
/owner                           → OwnerDashboard (OwnerLayout, RequireOwner)
/owner/rooms                     → OwnerRooms
/owner/bookings                  → OwnerBookings
/owner/check-in-out              → OwnerCheckInOut
/owner/booking-history           → OwnerBookingHistory
/owner/customers                 → OwnerCustomers
/owner/chat                      → OwnerChat
/owner/offers                    → OwnerOffers
```

Note: Landing page auto-redirects admins to `/admin` and owners to `/owner` via `useProfile()` hook.

## Directory Structure

```
frontend/src/
├── main.jsx
├── App.jsx
├── routes/
│   └── AppRouter.jsx
├── auth/
│   ├── AuthProvider.jsx      # Supabase auth context
│   ├── useAuth.js            # hook: { session, user, loading, signIn, signUp, signOut }
│   ├── useProfile.js         # hook: { profile, role, isAdmin, isOwner, isCustomer }
│   ├── RequireAuth.jsx       # route guard: any authenticated user
│   ├── RequireAdmin.jsx      # route guard: admin role
│   └── RequireOwner.jsx      # route guard: owner role (or admin impersonating)
├── redux/
│   ├── store.js              # configureStore with all slice reducers
│   ├── api.js                # axios instance, auth interceptor, impersonation header
│   └── slices/
│       ├── authSlice.js      # signup, login, logout, getMe, updateProfile
│       ├── roomSlice.js      # fetchRooms, fetchRoomById, createRoom, updateRoom, deleteRoom
│       ├── bookingSlice.js   # fetchBookings, createBooking, approveBooking, rejectBooking, fetchAvailability
│       ├── reviewSlice.js    # fetchReviewsByRoom, upsertReview, deleteReview
│       ├── notificationSlice.js  # fetchNotifications, markRead, markAllRead, addNotification (socket)
│       ├── contactSlice.js   # submitContact, fetchMessages, markMessageRead, deleteMessage
│       ├── userSlice.js      # fetchUsers, updateUser, deleteUser (admin only)
│       ├── stripeSlice.js    # createCheckoutSession
│       ├── ownerSlice.js     # owner-scoped: rooms, bookings, customers, stats
│       ├── chatSlice.js      # conversations, messages, contacts, real-time incoming
│       ├── offerSlice.js     # admin offers, owner offers, public active/banners/roomOffer
│       └── heroBannerSlice.js # admin CRUD + public fetch for hero banners
├── lib/
│   ├── supabaseClient.js     # Supabase browser client (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
│   ├── algoliaClient.js      # Algolia search client + helpers (buildFilters, getUserLocation)
│   ├── algoliaSync.js        # Algolia sync utilities
│   ├── stripe.js             # getStripe(), createCheckoutSession(), redirectToCheckout()
│   ├── socket.js             # connectSocket(token), disconnectSocket(), getSocket()
│   ├── socketClient.js       # createAuthenticatedSocket() — creates a socket.io client with Supabase JWT
│   ├── heroBanner.js         # Hero banner constants, defaults, normalization, position/width helpers
│   └── SocketProvider.jsx    # React context for socket instance, useSocket() hook
├── theme/
│   ├── ThemeProvider.jsx     # dark/light context, useTheme() hook
│   └── ThemeToggle.jsx       # toggle component
├── i18n/
│   ├── index.js              # i18next setup with 15 languages, LanguageDetector
│   └── locales/              # en.json, es.json, fr.json, de.json, ar.json, zh.json, etc.
├── styles/
│   └── index.css             # Tailwind directives, CSS variable themes, Ant Design dark overrides
├── hooks/
│   ├── useNotifications.js   # useAdminNotifications(), useUserNotifications(), useOwnerNotifications()
│   ├── useRecommendations.js # personalized room recommendations
│   ├── useWelcomeOffer.js    # first-visit welcome offer logic
│   └── useCampaignBanner.js  # campaign banner display logic
├── components/
│   ├── ui/
│   │   ├── Button.jsx           # Shared button: variants (solid/outline/ghost/danger), sizes (sm/md/lg), disabled state
│   │   └── PageHeader.jsx       # Shared page header (title, subtitle, actions) — used by admin + owner pages
│   ├── HeroBannerCanvas.jsx     # Shared hero banner renderer (used by landing slider + admin editor)
│   ├── OfferBannerCanvas.jsx
│   ├── NotificationToast.jsx
│   ├── Navbar.jsx
│   ├── LanguageSelector.jsx
│   ├── rooms/
│   │   └── RoomEditorPage.jsx   # Shared room editor (used by admin + owner room create/edit)
│   └── chat/
│       ├── ChatComposer.jsx      # Shared message composer with emoji picker + file attachment support
│       ├── ChatMessageBubble.jsx # Shared message bubble renderer for text + uploaded files
│       └── chatHelpers.js        # Shared attachment preview/size helpers
├── layouts/
│   └── MainLayout.jsx        # generic layout with Outlet
├── pages/
│   ├── Auth.jsx              # login/signup page
│   └── Dashboard.jsx         # /host dashboard
├── guest/                    # Guest (customer) feature module
│   ├── pages/
│   │   ├── Landing.jsx       # homepage with sections (auto-redirects admin→/admin, owner→/owner)
│   │   ├── RoomDetail.jsx    # /room/:roomId — full room detail page (public, no auth required)
│   │   ├── Booking.jsx       # room booking page with calendar + payment
│   │   ├── Profile.jsx       # user profile editor
│   │   ├── MyBookings.jsx    # list of user's bookings
│   │   ├── LikedRooms.jsx    # favorited rooms
│   │   ├── ContactUs.jsx     # contact form
│   │   ├── PaymentSuccess.jsx
│   │   └── PaymentCancel.jsx
│   ├── sections/             # Landing page sections
│   │   ├── LandingHero.jsx
│   │   ├── LandingSearch.jsx
│   │   ├── LandingGeoSearch.jsx
│   │   ├── LandingCategories.jsx
│   │   ├── LandingFeatures.jsx
│   │   ├── LandingGallery.jsx
│   │   ├── LandingHowItWorks.jsx
│   │   ├── LandingTestimonials.jsx
│   │   └── LandingCTA.jsx
│   ├── components/
│   │   ├── RoomCard.jsx
│   │   ├── AvailabilityCalendar.jsx
│   │   ├── ChatWidget.jsx
    │   │   ├── AIChatBot/           # AI chatbot widget (index.jsx, EmailGate.jsx, ConversationHistory.jsx)
    │   │   ├── CampaignBanner.jsx
│   │   ├── WelcomeOfferBanner.jsx
│   │   ├── NotificationDropdown.jsx
│   │   ├── ui/               # Stars, FormInput, Button (re-export), Badge, Card, Pagination
│   │   ├── layout/           # GuestLayout, Navbar, Footer
│   │   └── search/           # SearchResults, SearchFilters, GeoSearch, GeoSearchBox, index.js
│   ├── hooks/
│   │   ├── useRoomCities.js
│   │   ├── useGuestPreferences.js
│   │   ├── usePagination.js
│   │   └── useSearchParams.js
│   ├── utils/
│   │   ├── constants.js
│   │   ├── format.js
│   │   ├── offers.js
│   │   ├── roomAvailability.js
│   │   ├── roomReviews.js
│   │   └── roomLikes.js
│   └── data/
│       └── rooms.js          # static room data / fallback
├── admin/                    # Admin panel module
│   ├── pages/                # All pages use shared PageHeader from components/ui/PageHeader.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Bookings.jsx
│   │   ├── Users.jsx
│   │   ├── Rooms.jsx
│   │   ├── Messages.jsx
│   │   ├── Chat.jsx
│   │   ├── Owners.jsx
│   │   ├── Offers.jsx
│   │   ├── OfferEditor.jsx        # Create/edit offer
│   │   ├── HeroBanners.jsx        # List/manage hero banners (toggle active, delete)
│   │   ├── HeroBannerEditor.jsx   # Create/edit hero banner with live preview, drag-to-position, per-device layout
│   │   ├── CheckInOut.jsx         # Today's guest check-in/check-out management
│   │   ├── BookingHistory.jsx     # 4-tab history: No-show, Completed, Rejected, Cancelled by Guest
│   │   └── AlgoliaSync.jsx
│   └── components/
│       ├── AdminPageHeader.jsx      # Re-export of components/ui/PageHeader.jsx (backward compat)
│       ├── NotificationDropdown.jsx
│       └── layout/
│           └── AdminLayout.jsx
└── owner/                    # Owner panel module
    ├── pages/                # All pages use shared PageHeader from components/ui/PageHeader.jsx
    │   ├── Dashboard.jsx
    │   ├── Rooms.jsx
    │   ├── RoomEditor.jsx
    │   ├── Bookings.jsx
    │   ├── CheckInOut.jsx         # Today's guest check-in/check-out management
    │   ├── BookingHistory.jsx     # 4-tab history: No-show, Completed, Rejected, Cancelled by Guest
    │   ├── Customers.jsx
    │   ├── Chat.jsx
    │   └── Offers.jsx
    └── components/
        ├── NotificationDropdown.jsx
        └── layout/
            └── OwnerLayout.jsx
```

## Redux Store Shape

```
{
  auth:          { user, profile, session, role, loading, error }
  rooms:         { rooms[], selectedRoom, total, loading, error }
  bookings:      { bookings[], selectedBooking, bookedDates[], total, todayBookings[], todayTotal, historyBookings[], historyTotal, loading, todayLoading, historyLoading, error }
  reviews:       { reviews[], loading, error }
  notifications: { notifications[], unreadCount, loading, error }
  contact:       { messages[], unreadCount, submitSuccess, loading, error }
  users:         { users[], selectedUser, userBookings[], total, loading, error }
  stripe:        { sessionId, sessionUrl, loading, error }
  owner:         { rooms[], roomsTotal, bookings[], bookingsTotal, todayBookings[], todayTotal, historyBookings[], historyTotal, customers[], customersTotal, customerBookings[], stats, loading, todayLoading, historyLoading, error }
  chat:          { contacts[], conversations[], activeConversationId, messages{}, loading, messagesLoading, error }
  offers:        { offers[], total, activeOffers[], banners[], roomOffer, loading, error }
  heroBanners:   { adminBanners[], publicBanners[], loading, publicLoading, publicLoaded, error }
}
```

## API Client (`frontend/src/redux/api.js`)

- Axios instance, base URL: `VITE_API_BASE_URL || "http://localhost:5000/api"`
- Request interceptor: attaches Supabase `access_token` from session as `Authorization: Bearer <token>`
- Impersonation: if `setImpersonation(ownerId)` was called, attaches `x-impersonate-owner` header
- Response interceptor: normalizes error messages

## Styling

- **Tailwind CSS** with custom semantic color tokens via CSS variables:
  - `surface`, `panel`, `ink`, `muted`, `border` — change based on `html.dark` class
  - Brand colors: `brand-50` through `brand-900` (blue), `accent` (orange)
- **Dark mode**: `darkMode: "class"` in tailwind config; toggled via `ThemeProvider`
- **Ant Design**: `antd/dist/reset.css` imported; dark overrides in `index.css`
- **Gradient utilities**: `.text-gradient`, `.text-gradient-dark`, `.text-gradient-brand`, `.text-gradient-accent`

## i18n

- 15 locales: en, es, fr, de, it, pt, nl, ru, tr, ar, hi, zh, ja, ko, th
- Detection order: localStorage (`daybnb_language`) → navigator → htmlTag
- Arabic has `dir: "rtl"`
- Use `useTranslation()` hook from `react-i18next`

## Socket.IO (Client)

- Connected via `SocketProvider` when user has a session
- Events listened: `notification:new`, `chat:message`, `chat:typing`
- Events emitted: `chat:join`, `chat:leave`, `chat:typing`, `impersonate:start`, `impersonate:stop`

## Chat UI

- Guest, owner, and admin chat surfaces share `components/chat/ChatComposer.jsx` for text entry.
- Composer adds emoji insertion via `emoji-picker-react` and optional file attachments up to 10 MB.
- `chatSlice.sendMessage` still posts through the existing REST endpoint; attachments switch the request to `multipart/form-data`.
- `components/chat/ChatMessageBubble.jsx` renders uploaded files inline as image previews or downloadable attachment cards.

## AI Chatbot (`guest/components/AIChatBot/`)

OpenAI-powered AI assistant widget rendered on all guest pages via `GuestLayout`.

### Files
| File | Purpose |
|------|---------|
| `index.jsx` | Main widget — chat UI, streaming API integration, conversation management |
| `EmailGate.jsx` | Email collection form for unauthenticated guests |
| `ConversationHistory.jsx` | Conversation list with date grouping, delete, and selection |

### Architecture
- **Real AI responses** via `POST /api/ai/chat/stream` (SSE streaming) with fallback to `POST /api/ai/chat` (non-streaming)
- **Auth**: Uses `optionalAuth` — works for logged-in users (sends JWT) and email-gated guests
- **Storage**: Conversations persist in `localStorage` (`daybnb_ai_chat` key). Session metadata tracked server-side in `ai_chat_sessions` table.
- **Streaming**: Uses `fetch` + `ReadableStream` to parse SSE chunks and update the assistant message in real-time as tokens arrive
- **Quick prompts**: Fetched from `GET /api/ai/prompts` on mount, with hardcoded defaults as fallback
- **Abort support**: In-flight streaming requests are abortable via `AbortController` (cleaned up on unmount)

### Data Flow
1. User sends message → `handleSend()` adds user message to conversation, calls `fetchAIResponse()`
2. `fetchAIResponse()` sends full conversation history to `/api/ai/chat/stream`
3. SSE chunks stream in → assistant message text is progressively updated in state
4. On error → falls back to non-streaming `/api/ai/chat` endpoint
5. Conversations auto-save to localStorage on every state change

### Context Awareness
The backend enriches each AI request with:
- Up to 10 rooms from the database (titles, prices, amenities, etc.)
- The authenticated user's last 10 bookings (dates, statuses, room names)
- Currently active offers/discounts
This allows the AI to answer specific questions like "What rooms are available?" or "What's the status of my booking?"

## Search (Algolia)

- Uses `react-instantsearch` components + `algoliasearch/lite`
- Index: `daybnb_places` (configurable via `VITE_ALGOLIA_INDEX_NAME`)
- GeoSearch component uses browser geolocation + Algolia aroundLatLng
- Filters: price range, availability date, amenities
- Fallback to backend `/api/rooms` if Algolia is not configured

## Hero Banner System

Admin-managed landing page slider. If no active banners exist, `LandingHero` renders a default static hero with i18n text.

### Data Flow

1. `LandingHero` dispatches `fetchPublicHeroBanners` → `GET /api/hero-banners` (public, no auth)
2. If `publicBanners.length > 0`, renders a `react-slick` carousel of `HeroBannerCanvas` components
3. If empty, renders `DefaultLandingHero` (unchanged from original design)

### Admin Editor (`HeroBannerEditor.jsx`)

- Create/edit form at `/admin/hero-banners/new` and `/admin/hero-banners/:bannerId/edit`
- Live preview with device switcher (desktop/tablet/mobile) — preview sizes match real device aspect ratios
- Drag-to-reposition: pointer events on the text box update `box_x_<device>` / `box_y_<device>` in real time
- Range sliders for X position (0–92%), Y position (0–76%), width per device
- Background type picker: image URL, solid color (color picker), or gradient (two colors + direction)
- Background opacity slider (0–1)
- Text alignment (left/center/right)
- Sort order (integer, ascending) controls carousel slide order
- Visibility toggle (is_active)

### `HeroBannerCanvas` Component

Shared renderer used in both the landing page slider and admin editor preview. Accepts:
- `banner` — normalized banner object
- `device` — `"desktop"` | `"tablet"` | `"mobile"` (optional; auto-detects from viewport width if omitted)
- `preview` — boolean, disables CTA link clicks when true
- `containerRef` — for drag positioning in the editor
- `onTextBoxPointerDown` — callback for drag-to-reposition

Uses `useViewportDevice()` hook internally to detect breakpoints: `<640px` = mobile, `<1024px` = tablet, else desktop.

### `lib/heroBanner.js` Exports

- `HERO_BANNER_DEFAULTS` — default field values for new banners
- `HERO_BACKGROUND_TYPES`, `HERO_TEXT_ALIGNMENTS`, `HERO_GRADIENT_DIRECTIONS`, `HERO_PREVIEW_DEVICES` — option lists
- `HERO_PREVIEW_FRAMES` — aspect ratios and labels per device
- `normalizeHeroBanner(banner)` — merges with defaults, coerces numerics
- `getHeroBoxWidthPercent(banner, device)` — returns width% for a device
- `getHeroBoxPosition(banner, device)` — returns `{ x, y }` for a device
- `clampHeroBoxPosition(banner, device)` — returns clamped `{ left, top }` within bounds
- `getHeroGradientCssDirection(direction)` — converts `"to-r"` → `"to right"` etc.
- `getHeroBackgroundLayerStyle(banner)` — returns CSS style object for the background layer
- `getHeroPreviewWidth(device)`, `getHeroPreviewFrame(device)` — preview sizing helpers

### `socketClient.js`

Standalone utility to create an authenticated Socket.IO client instance. Reads the current Supabase session token and connects to the socket URL derived from `VITE_API_BASE_URL`. Used as an alternative/complement to `SocketProvider` for cases needing a one-off socket connection.

## Room Detail Page (`/room/:roomId`)

Public page (no auth required) that displays full room information:
- Room images, title, location, property/place type, guest capacity
- Amenities grid (with icons from `AMENITY_ICONS` map in the component)
- Safety features
- Room badges (instant book, guest favorite, luxe, allows pets, self check-in)
- Review list with star ratings + review form (requires auth)
- Offer pricing (fetches best offer via `fetchOfferForRoom`)
- Booking CTA linking to `/book/:roomId`

Dispatches: `fetchRoomById`, `fetchReviewsByRoom`, `fetchOfferForRoom`. Cleans up on unmount via `clearSelectedRoom`, `clearReviews`, `clearRoomOffer`.
