# Backend Architecture

## Entry Point

`backend/server.js` → loads dotenv, creates HTTP server from Express app, attaches Socket.IO, listens on `PORT` (default 5000).

`backend/src/app.js` → Express app setup: CORS, morgan logging, body parsing (skips JSON parse for `/api/stripe/webhook`), health check at `/api/health`, mounts all routes under `/api`, 404 handler, global error handler.

## Directory Structure

```
backend/
├── server.js                 # HTTP server + Socket.IO init
├── package.json              # CommonJS, node >= 18
└── src/
    ├── app.js                # Express app configuration
    ├── config/
    │   ├── supabase.js       # supabase (anon), supabaseAdmin (service role), getSupabaseClient(token)
    │   └── stripe.js         # Stripe instance (STRIPE_SECRET_KEY)
    ├── middleware/
    │   ├── auth.js           # requireAuth (JWT verify), optionalAuth
    │   ├── rbac.js           # attachRole (reads profiles.user_type), requireRole(...roles)
    │   ├── impersonate.js    # handleImpersonation (admin-only, sets req.effectiveUserId)
    │   ├── admin.js          # requireAdmin (legacy wrapper around rbac)
    │   └── errorHandler.js   # global error handler (ApiError-aware)
    ├── utils/
    │   ├── ApiError.js       # Custom error: badRequest, unauthorized, forbidden, notFound, conflict, internal
    │   ├── asyncHandler.js   # Wraps async route handlers to catch rejections
    │   └── algoliaSync.js    # Server-side Algolia sync (REST API, no SDK)
    ├── routes/
    │   ├── index.js          # Mounts all sub-routers under /api
    │   ├── auth.js
    │   ├── rooms.js
    │   ├── bookings.js
    │   ├── users.js
    │   ├── reviews.js
    │   ├── notifications.js
    │   ├── contact.js
    │   ├── stripe.js
    │   ├── likes.js
    │   ├── admin.js          # Includes hero banner admin CRUD + Algolia sync endpoints
    │   ├── owner.js
    │   ├── chat.js
    │   ├── offers.js
    │   └── heroBanners.js    # Public hero banner route (GET /)
    ├── controllers/
    │   ├── authController.js
    │   ├── roomController.js
    │   ├── bookingController.js
    │   ├── userController.js
    │   ├── reviewController.js
    │   ├── notificationController.js
    │   ├── contactController.js
    │   ├── stripeController.js
    │   ├── likesController.js
    │   ├── adminController.js
    │   ├── ownerController.js
    │   ├── chatController.js
    │   ├── offerController.js
    │   └── heroBannerController.js  # Hero banner CRUD (admin) + public getActive
    └── socket/
        └── index.js          # Socket.IO server: auth, rooms, notifications, chat events
```

## Middleware Chain

Typical protected route: `requireAuth → attachRole → [requireRole(...)] → [handleImpersonation] → controller`

### `requireAuth` (auth.js)
- Reads `Authorization: Bearer <token>` header
- Calls `supabase.auth.getUser(token)` to verify
- Sets `req.user` (Supabase user object) and `req.accessToken`

### `optionalAuth` (auth.js)
- Same as requireAuth but doesn't fail if no token; continues with `req.user = undefined`

### `attachRole` (rbac.js)
- Queries `profiles.user_type` for `req.user.id`
- Sets `req.userRole` ("admin" | "owner" | "customer")

### `requireRole(...roles)` (rbac.js)
- Checks `req.userRole` against allowed roles, returns 403 if not matched

### `handleImpersonation` (impersonate.js)
- Checks `x-impersonate-owner` header
- Only admins can impersonate; target must be an owner
- Sets `req.impersonating`, `req.effectiveUserId`, `req.effectiveRole`, `req.impersonatedOwner`
- Controllers use `req.effectiveUserId` to scope data to the impersonated owner

## API Routes

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/signup` | None | Register (email, password, full_name, role) |
| POST | `/login` | None | Sign in, returns user + session + role |
| POST | `/logout` | None | Sign out |
| GET | `/me` | requireAuth + attachRole + impersonate | Current user profile + impersonation context |
| POST | `/ensure-profile` | requireAuth | Create profile row if missing |
| PUT | `/profile` | requireAuth | Update own profile |

### Rooms (`/api/rooms`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | None | List rooms (filters: type, search, guests, price, date, sort, owner_id, property_type, place_type, amenities, etc.) |
| GET | `/:id` | None | Single room |
| POST | `/` | Admin | Create room |
| PUT | `/:id` | Admin | Update room |
| DELETE | `/:id` | Admin | Delete room |

### Bookings (`/api/bookings`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/availability/:roomId` | None | Booked dates for a room |
| GET | `/booked-rooms?date=` | None | Room IDs booked on a date |
| GET | `/` | requireAuth + attachRole | List bookings (role-scoped) |
| GET | `/:id` | requireAuth + attachRole | Single booking (access control) |
| POST | `/` | requireAuth + attachRole | Create booking (notifies owner/admin) |
| PUT | `/:id` | requireAuth + attachRole | Update booking |
| PATCH | `/:id/approve` | Admin/Owner | Approve (notifies customer) |
| PATCH | `/:id/reject` | Admin/Owner | Reject with reason (notifies customer) |
| DELETE | `/:id` | requireAuth + attachRole | Cancel booking (notifies owner/admin) |

### Users (`/api/users`) — Admin only
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all users |
| GET | `/:id` | Single user |
| PUT | `/:id` | Update user |
| DELETE | `/:id` | Delete user |
| GET | `/:id/bookings` | User's bookings |

### Admin (`/api/admin`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/impersonate/:ownerId` | Start impersonation |
| POST | `/stop-impersonate` | Stop impersonation |
| GET | `/owners` | List owners |
| GET | `/owners/:ownerId` | Single owner |
| PUT | `/owners/:ownerId` | Update owner |
| DELETE | `/owners/:ownerId` | Delete owner |
| PUT | `/users/:userId/role` | Change user role |
| GET | `/dashboard-stats` | Dashboard statistics |
| GET | `/offers` | All offers |
| POST | `/offers` | Create offer |
| PUT | `/offers/:id` | Update offer |
| DELETE | `/offers/:id` | Delete offer |
| GET | `/hero-banners` | All hero banners (sorted by sort_order, created_at) |
| POST | `/hero-banners` | Create hero banner (sets created_by to req.user.id) |
| PUT | `/hero-banners/:id` | Update hero banner (partial update, fetches existing first) |
| DELETE | `/hero-banners/:id` | Delete hero banner |
| POST | `/algolia/full-sync` | Trigger full Algolia sync of all rooms |
| POST | `/algolia/configure` | Configure Algolia index settings |

### Owner (`/api/owner`) — Owner or Admin impersonating
| Method | Path | Description |
|--------|------|-------------|
| GET | `/profile` | Owner's profile |
| GET | `/stats` | Owner dashboard stats |
| GET | `/rooms` | Owner's rooms |
| POST | `/rooms` | Create room (owned by current owner) |
| PUT | `/rooms/:id` | Update own room |
| DELETE | `/rooms/:id` | Delete own room |
| GET | `/bookings` | Bookings on owner's rooms |
| PATCH | `/bookings/:id/approve` | Approve booking |
| PATCH | `/bookings/:id/reject` | Reject booking |
| GET | `/customers` | Customers who booked owner's rooms |
| GET | `/customers/:customerId` | Single customer |
| GET | `/customers/:customerId/bookings` | Customer's bookings on owner's rooms |
| GET | `/offers` | Owner's offers |
| POST | `/offers` | Create offer for own rooms |
| PUT | `/offers/:id` | Update own offer |
| DELETE | `/offers/:id` | Delete own offer |

### Offers (`/api/offers`) — Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/active` | All currently active offers |
| GET | `/banners` | Active offers with show_banner=true |
| GET | `/room/:roomId` | Best offer for a specific room |

### Hero Banners (`/api/hero-banners`) — Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Active hero banners ordered by sort_order (is_active=true only) |

### Reviews (`/api/reviews`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ratings` | None | Batch ratings for rooms |
| GET | `/` | None | Reviews by room_id |
| POST | `/` | requireAuth | Create/update review |
| DELETE | `/:id` | requireAuth | Delete review |

### Notifications (`/api/notifications`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | requireAuth + impersonate | User's notifications |
| GET | `/admin` | Admin | Admin notifications |
| PATCH | `/read-all` | requireAuth + impersonate | Mark all read |
| PATCH | `/:id/read` | requireAuth + impersonate | Mark single read |
| DELETE | `/all` | requireAuth + impersonate | Delete all |
| DELETE | `/:id` | requireAuth | Delete single |

### Contact (`/api/contact`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | optionalAuth | Submit contact form |
| GET | `/` | Admin | All messages |
| PATCH | `/:id/read` | Admin | Mark read |
| DELETE | `/:id` | Admin | Delete message |

### Likes (`/api/likes`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | requireAuth | User's liked room IDs |
| POST | `/` | requireAuth | Like a room |
| DELETE | `/:roomId` | requireAuth | Unlike a room |

### Chat (`/api/chat`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/contacts` | requireAuth | Chat contacts (admins + room owners) |
| GET | `/conversations` | requireAuth | User's conversations |
| GET | `/conversations/:id/messages` | requireAuth | Messages in conversation |
| POST | `/conversations/:id/messages` | requireAuth | Send message (emits via socket) |
| POST | `/conversations/start/:recipientId` | requireAuth | Get or create conversation |
| PATCH | `/conversations/:id/read` | requireAuth | Mark messages read |
| GET | `/panel/conversations` | Admin/Owner | All conversations for panel |

### Stripe (`/api/stripe`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/create-checkout-session` | requireAuth | Create Stripe checkout session |
| POST | `/verify-session` | requireAuth | Verify session after redirect |
| POST | `/webhook` | None (raw body) | Stripe webhook handler |

## Socket.IO Server (`backend/src/socket/index.js`)

### Authentication
- Middleware verifies Supabase JWT from `socket.handshake.auth.token`
- Sets `socket.data.user` and `socket.data.role`

### Rooms Joined on Connect
- `user:<userId>` — personal room
- `role:admin` — if admin
- `role:owner` — if owner

### Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `impersonate:start` | client→server | Admin joins owner's user room |
| `impersonate:stop` | client→server | Admin leaves impersonated room |
| `chat:join` | client→server | Join conversation room |
| `chat:leave` | client→server | Leave conversation room |
| `chat:typing` | client→server→others | Typing indicator |
| `chat:message` | server→client | New chat message |
| `notification:new` | server→client | New notification |

### Emit Helpers (used by controllers)
- `emitNotificationToUser(userId, notification)` — emits to `user:<userId>`
- `emitNotificationToRole(role, notification)` — emits to `role:<role>`

## Error Handling

- `ApiError` class with static factories: `.badRequest()`, `.unauthorized()`, `.forbidden()`, `.notFound()`, `.conflict()`, `.internal()`
- Global `errorHandler` middleware catches `ApiError` instances and unhandled errors
- All controller functions wrapped in `asyncHandler` to auto-forward async rejections

## Notification System

Booking events trigger notifications persisted in `notifications` table and emitted via Socket.IO:
- `booking_created` → notifies room owner or admins
- `booking_approved` → notifies customer
- `booking_rejected` → notifies customer
- `booking_updated` → notifies room owner or admins
- `booking_cancelled` → notifies room owner or admins

## Hero Banner Controller (`heroBannerController.js`)

Handles CRUD for the `hero_banners` table. Key implementation details:

- **Validation**: `normalizePayload(body, { partial, existingBanner })` validates and coerces all fields. Supports full (create) and partial (update) modes.
- **Valid enums**: `VALID_BACKGROUND_TYPES` (`image`, `solid`, `gradient`), `VALID_TEXT_ALIGNMENTS` (`left`, `center`, `right`), `VALID_GRADIENT_DIRECTIONS` (8 directions).
- **Numeric clamping**: `toClampedNumber(value, { min, max, fallback, integer })` for all position/width/opacity fields.
- **Nullable text**: `toNullableText(value)` trims strings, returns `null` for empty.
- **Image requirement**: Enforces `background_image` is required when `background_type === "image"`.
- **Update flow**: `updateAdmin` first fetches the existing banner to compare partial updates against current state (especially for image requirement check).
- All handlers use `supabaseAdmin` (bypasses RLS).

## Algolia Sync Utility (`backend/src/utils/algoliaSync.js`)

Server-side Algolia synchronization using direct REST API calls (no Algolia SDK dependency).

### Configuration

- `ALGOLIA_APP_ID`, `ALGOLIA_ADMIN_KEY`, `ALGOLIA_INDEX_NAME` (default: `daybnb_places`) from env
- `isConfigured()` — returns true if both app ID and admin key are set
- `ALGOLIA_SYNC_INTERVAL_MS` — auto-sync interval (default: 30 minutes)

### Key Functions

| Function | Description |
|----------|-------------|
| `fullSync()` | Fetches all rooms from Supabase, enriches with average ratings and booked dates, replaces the entire Algolia index |
| `upsertRecord(room)` | Upserts a single room record to Algolia |
| `deleteRecord(roomId)` | Deletes a single record from Algolia |
| `configureIndex()` | Sets searchable attributes, facets, ranking, and geo settings on the Algolia index |
| `startAutoSync()` | Starts a periodic full sync on `AUTO_SYNC_INTERVAL_MS` |
| `stopAutoSync()` | Stops the periodic sync |

### Algolia Record Shape

Each room is indexed with: `objectID` (room id), all room fields, `_geoloc` (lat/lng), `averageRating`, `reviewCount`, `bookedDates[]` (dates with active bookings).

### Retry Logic

API requests use exponential backoff with up to `RETRY_ATTEMPTS` (3) retries and `RETRY_BASE_DELAY_MS` (1000ms) base delay.
