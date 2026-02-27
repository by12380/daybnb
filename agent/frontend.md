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
/                     → Landing (GuestLayout)
/contact              → ContactUs (GuestLayout)
/auth                 → Auth (GuestLayout)
/book/:roomId         → Booking (GuestLayout, RequireAuth)
/profile              → Profile (GuestLayout, RequireAuth)
/my-bookings          → MyBookings (GuestLayout, RequireAuth)
/liked-rooms          → LikedRooms (GuestLayout, RequireAuth)
/payment-success      → PaymentSuccess (GuestLayout, RequireAuth)
/payment-cancel       → PaymentCancel (GuestLayout, RequireAuth)
/host                 → Dashboard (MainLayout)
/admin                → AdminDashboard (AdminLayout, RequireAdmin)
/admin/bookings       → AdminBookings
/admin/users          → AdminUsers
/admin/rooms          → AdminRooms
/admin/messages       → AdminMessages
/admin/chat           → AdminChat
/admin/owners         → AdminOwners
/admin/offers         → AdminOffers
/admin/algolia        → AdminAlgoliaSync
/owner                → OwnerDashboard (OwnerLayout, RequireOwner)
/owner/rooms          → OwnerRooms
/owner/bookings       → OwnerBookings
/owner/customers      → OwnerCustomers
/owner/chat           → OwnerChat
/owner/offers         → OwnerOffers
```

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
│       └── offerSlice.js     # admin offers, owner offers, public active/banners/roomOffer
├── lib/
│   ├── supabaseClient.js     # Supabase browser client (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
│   ├── algoliaClient.js      # Algolia search client + helpers (buildFilters, getUserLocation)
│   ├── algoliaSync.js        # Algolia sync utilities
│   ├── stripe.js             # getStripe(), createCheckoutSession(), redirectToCheckout()
│   ├── socket.js             # connectSocket(token), disconnectSocket(), getSocket()
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
│   ├── Navbar.jsx
│   └── LanguageSelector.jsx
├── layouts/
│   └── MainLayout.jsx        # generic layout with Outlet
├── pages/
│   ├── Auth.jsx              # login/signup page
│   └── Dashboard.jsx         # /host dashboard
├── guest/                    # Guest (customer) feature module
│   ├── pages/
│   │   ├── Landing.jsx       # homepage with sections
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
│   │   ├── CampaignBanner.jsx
│   │   ├── WelcomeOfferBanner.jsx
│   │   ├── NotificationDropdown.jsx
│   │   ├── ui/               # Stars, FormInput, Button, Badge, Card, Pagination
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
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Bookings.jsx
│   │   ├── Users.jsx
│   │   ├── Rooms.jsx
│   │   ├── Messages.jsx
│   │   ├── Chat.jsx
│   │   ├── Owners.jsx
│   │   ├── Offers.jsx
│   │   └── AlgoliaSync.jsx
│   └── components/
│       ├── NotificationDropdown.jsx
│       └── layout/
│           └── AdminLayout.jsx
└── owner/                    # Owner panel module
    ├── pages/
    │   ├── Dashboard.jsx
    │   ├── Rooms.jsx
    │   ├── Bookings.jsx
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
  bookings:      { bookings[], selectedBooking, bookedDates[], total, loading, error }
  reviews:       { reviews[], loading, error }
  notifications: { notifications[], unreadCount, loading, error }
  contact:       { messages[], unreadCount, submitSuccess, loading, error }
  users:         { users[], selectedUser, userBookings[], total, loading, error }
  stripe:        { sessionId, sessionUrl, loading, error }
  owner:         { rooms[], roomsTotal, bookings[], bookingsTotal, customers[], customersTotal, customerBookings[], stats, loading, error }
  chat:          { contacts[], conversations[], activeConversationId, messages{}, loading, messagesLoading, error }
  offers:        { offers[], total, activeOffers[], banners[], roomOffer, loading, error }
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

## Search (Algolia)

- Uses `react-instantsearch` components + `algoliasearch/lite`
- Index: `daybnb_places` (configurable via `VITE_ALGOLIA_INDEX_NAME`)
- GeoSearch component uses browser geolocation + Algolia aroundLatLng
- Filters: price range, availability date, amenities
- Fallback to backend `/api/rooms` if Algolia is not configured
