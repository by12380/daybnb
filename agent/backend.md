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
    │   ├── aiChat.js         # AI chatbot routes (chat, stream, prompts)
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
    │   ├── aiChatController.js  # OpenAI-powered AI chatbot (context-aware, streaming)
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
| GET | `/today` | Admin/Owner | Today's bookings for check-in/out management |
| GET | `/history?tab=` | Admin/Owner | Booking history by tab: no_show, completed, rejected, cancelled |
| GET | `/` | requireAuth + attachRole | List bookings (role-scoped) |
| GET | `/:id` | requireAuth + attachRole | Single booking (access control) |
| POST | `/` | requireAuth + attachRole | Create booking (notifies owner/admin) |
| PUT | `/:id` | requireAuth + attachRole | Update booking |
| PATCH | `/:id/approve` | Admin/Owner | Approve (notifies customer) |
| PATCH | `/:id/reject` | Admin/Owner | Reject with reason (notifies customer) |
| PATCH | `/:id/check-in` | Admin/Owner | Check in guest (approved/confirmed → checked_in) |
| PATCH | `/:id/check-out` | Admin/Owner | Check out guest (checked_in → checked_out) |
| DELETE | `/:id` | requireAuth + attachRole | Cancel booking — soft-delete, sets status to "cancelled" (notifies owner/admin) |

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
| GET | `/analytics?period=` | Comprehensive analytics (revenue, funnel, time-series, top rooms/owners, payment breakdown). Period: `7d`, `30d`, `6m`, `all` |
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
| GET | `/bookings/today` | Today's bookings on owner's rooms for check-in/out |
| GET | `/bookings/history?tab=` | Booking history by tab: no_show, completed, rejected, cancelled |
| GET | `/bookings` | Bookings on owner's rooms |
| PATCH | `/bookings/:id/approve` | Approve booking |
| PATCH | `/bookings/:id/reject` | Reject booking |
| PATCH | `/bookings/:id/check-in` | Check in guest |
| PATCH | `/bookings/:id/check-out` | Check out guest |
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
| POST | `/conversations/:id/messages` | requireAuth | Send message via JSON or multipart form data with optional `attachment`; persists first, then emits via socket |
| POST | `/conversations/start/:recipientId` | requireAuth | Get or create conversation |
| PATCH | `/conversations/:id/read` | requireAuth | Mark messages read |
| GET | `/panel/conversations` | Admin/Owner | All conversations for panel |

### AI Chat (`/api/ai`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/chat` | optionalAuth | Send messages to AI chatbot, returns full response JSON (`{ reply, model, usage }`) |
| POST | `/chat/stream` | optionalAuth | Send messages to AI chatbot with SSE streaming response (Server-Sent Events) |
| GET | `/prompts` | None | Get suggested quick prompts for the AI chatbot |

**Context building**: Each request fetches up to 10 recent rooms, the authenticated user's last 10 bookings, and currently active offers from Supabase. This context is injected into the system prompt so the AI can answer questions about specific rooms, user bookings, and available discounts.

**Session tracking**: If `sessionId` is provided in the request body, an `ai_chat_sessions` row is upserted to track usage analytics. Messages themselves are stored in the client's localStorage.

**Request body** (POST `/chat` and `/chat/stream`):
- `messages` (required) — array of `{ role: "user"|"assistant", text: string }`
- `sessionId` (optional) — client-generated conversation ID for session tracking
- `guestEmail` (optional) — email from EmailGate for unauthenticated users

**Streaming format** (POST `/chat/stream`):
- Content-Type: `text/event-stream`
- Each chunk: `data: {"content":"..."}\n\n`
- Final event: `data: [DONE]\n\n`

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
| `chat:message` | server→client | New chat message, including optional attachment metadata |
| `notification:new` | server→client | New notification |

### Emit Helpers (used by controllers)
- `emitNotificationToUser(userId, notification)` — emits to `user:<userId>`
- `emitNotificationToRole(role, notification)` — emits to `role:<role>`

## Chat Attachments

- Route-level upload parsing uses `multer.memoryStorage()` in `routes/chat.js`.
- `chatController.sendMessage` accepts either plain text messages or multipart requests with a single `attachment`.
- Uploaded files are stored in Supabase Storage bucket `chat-attachments` by default (`CHAT_ATTACHMENTS_BUCKET` can override it).
- The realtime flow is unchanged: messages are inserted first and only then broadcast through the existing `chat:message` socket event.

## AI Chat Controller (`aiChatController.js`)

OpenAI-powered AI assistant that provides context-aware responses about the Daybnb platform.

### Architecture
- Uses `openai` Node.js SDK with configurable model (`AI_CHAT_MODEL` env var, default: `gpt-4o-mini`)
- Builds a rich system prompt with platform policies + dynamic context from Supabase
- Supports both synchronous (`chat`) and streaming (`chatStream`) response modes
- Uses `optionalAuth` middleware — works for both authenticated users and email-gated guests

### Context Fetching (per request)
| Function | Data | Limit |
|----------|------|-------|
| `fetchRoomContext()` | Room details (title, location, price, amenities, etc.) | 10 most recent rooms |
| `fetchBookingContext(userId)` | User's bookings with room names and statuses | 10 most recent bookings (auth users only) |
| `fetchActiveOffers()` | Currently active discount offers | 5 offers |

### Session Tracking
- Upserts `ai_chat_sessions` row on each request (if `sessionId` provided)
- Tracks: user_id, guest_email, message_count, last_active_at
- Non-blocking in streaming mode (fire-and-forget)

### Configuration
| Env Var | Default | Description |
|---------|---------|-------------|
| `OPENAI_API_KEY` | (required) | OpenAI API key |
| `AI_CHAT_MODEL` | `gpt-4o-mini` | Model identifier |

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
