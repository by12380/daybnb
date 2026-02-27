# Database Schema (Supabase / PostgreSQL)

## Tables

### `profiles`
User profile data linked to Supabase Auth users.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Same as auth.users.id |
| email | TEXT | |
| full_name | TEXT | |
| phone | TEXT | |
| gender | TEXT | |
| address_line1 | TEXT | |
| address_line2 | TEXT | |
| city | TEXT | |
| state_region | TEXT | |
| postal_code | TEXT | |
| country | TEXT | |
| user_type | TEXT | `"admin"`, `"owner"`, `"customer"` |
| updated_at | TIMESTAMPTZ | |

### `rooms`
Bookable spaces/properties.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT (PK) | UUID string (e.g., `"seed-001"` or `crypto.randomUUID()`) |
| title | TEXT | NOT NULL |
| location | TEXT | City/area name |
| type | TEXT | Room category: `"room"`, `"villa"`, `"suite"`, `"studio"`, `"resort"` |
| guests | INT | Max guest count |
| price_per_day | NUMERIC | |
| image | TEXT | URL |
| tags | TEXT[] | Array of tag strings |
| owner_id | TEXT | References profiles.id (nullable for admin-owned) |
| latitude | FLOAT | For geo search |
| longitude | FLOAT | For geo search |
| property_type | TEXT | `"house"`, `"apartment"`, `"hotel"` (CHECK constraint) |
| place_type | TEXT | `"entire_home"`, `"room"` (CHECK constraint) |
| bedrooms | INT | Default 1 |
| beds | INT | Default 1 |
| bathrooms | INT | Default 1 |
| instant_book | BOOLEAN | Default false |
| self_checkin | BOOLEAN | Default false |
| allows_pets | BOOLEAN | Default false |
| is_guest_favorite | BOOLEAN | Default false |
| is_luxe | BOOLEAN | Default false |
| amenities | TEXT[] | e.g., `['wifi','pool','kitchen','air_conditioning']` |
| safety_features | TEXT[] | e.g., `['smoke_alarm','carbon_monoxide_alarm']` |
| offer_title | TEXT | Legacy offer fields (inline on room) |
| offer_tag | TEXT | |
| offer_badge_text | TEXT | |
| offer_discount_percent | NUMERIC(5,2) | 0-100 |
| offer_active | BOOLEAN | |
| offer_start_date | DATE | |
| offer_end_date | DATE | |
| offer_updated_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

**Known amenities**: `wifi`, `kitchen`, `pool`, `hot_tub`, `free_parking`, `air_conditioning`, `heating`, `washer`, `dryer`, `tv`, `indoor_fireplace`, `bbq_grill`, `gym`, `breakfast`, `king_bed`, `crib`, `ev_charger`, `dedicated_workspace`, `iron`, `hair_dryer`, `smoking_allowed`

**Known safety features**: `smoke_alarm`, `carbon_monoxide_alarm`

### `bookings`
Room reservations.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| room_id | TEXT | References rooms.id |
| user_id | UUID | References profiles.id (the customer) |
| user_email | TEXT | Denormalized for notifications |
| user_full_name | TEXT | |
| user_phone | TEXT | |
| booking_date | DATE | The booked date |
| total_price | NUMERIC | |
| price_per_day | NUMERIC | |
| original_price | NUMERIC | Before discount |
| discount_amount | NUMERIC | |
| discount_applied | TEXT | Offer name/ID that was applied |
| status | TEXT | `"pending"`, `"approved"`, `"confirmed"`, `"rejected"` |
| payment_method | TEXT | `"online"`, `"pay_at_property"` |
| payment_status | TEXT | `"pending"`, `"paid"`, `"pay_at_property"` |
| created_at | TIMESTAMPTZ | |

**Status flow**: `pending` → `approved` (by owner/admin) → `confirmed` (after payment). Can be `rejected` at any point.

### `notifications`
In-app notification system.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| recipient_user_id | UUID | For user-targeted notifications |
| recipient_role | TEXT | For role-targeted notifications (e.g., `"admin"`) |
| type | TEXT | `"booking_created"`, `"booking_approved"`, `"booking_rejected"`, `"booking_updated"`, `"booking_cancelled"` |
| title | TEXT | |
| body | TEXT | |
| data | JSONB | Additional context (booking_id, room_id, etc.) |
| read | BOOLEAN | Default false |
| created_at | TIMESTAMPTZ | |

### `reviews`
Room reviews/ratings.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| room_id | TEXT | References rooms.id |
| user_id | UUID | References profiles.id |
| rating | INT | 1-5 stars |
| comment | TEXT | |
| created_at | TIMESTAMPTZ | |

Uses UPSERT — one review per user per room.

### `likes`
Room favorites.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID | |
| room_id | TEXT | |
| created_at | TIMESTAMPTZ | |

### `contact_messages`
Contact form submissions.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID | Nullable (optionalAuth) |
| name | TEXT | |
| email | TEXT | |
| subject | TEXT | |
| message | TEXT | |
| is_read | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### `chat_conversations`
Two-party chat conversations.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| participant_one | UUID | References profiles.id |
| participant_two | UUID | References profiles.id |
| last_message_at | TIMESTAMPTZ | Updated on new message |
| created_at | TIMESTAMPTZ | |

Normalized: participant_one < participant_two (alphabetical UUID ordering).

### `chat_messages`
Individual chat messages.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| conversation_id | UUID | References chat_conversations.id |
| sender_id | UUID | References profiles.id |
| content | TEXT | Message text |
| is_read | BOOLEAN | Default false |
| created_at | TIMESTAMPTZ | |

### `offers`
Discount/promotion offers (separate table from room inline offers).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| title | TEXT | NOT NULL |
| description | TEXT | |
| tag_label | TEXT | Badge text on listings |
| discount_type | TEXT | `"percentage"` or `"fixed"` |
| discount_value | NUMERIC | >= 0 |
| banner_image | TEXT | URL for campaign banner |
| show_banner | BOOLEAN | Default false |
| room_id | TEXT | NULL = not room-specific |
| owner_id | TEXT | NULL = not owner-specific |
| created_by | UUID | Admin or owner who created it |
| start_date | DATE | |
| end_date | DATE | >= start_date |
| is_active | BOOLEAN | Default true |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Offer scope precedence**: room-specific → owner-level → site-wide (all null).

### `special_offer_campaigns`
Landing page promotional banners (legacy/alternative to offers.show_banner).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| title | TEXT | |
| subtitle | TEXT | |
| image_url | TEXT | |
| cta_text | TEXT | |
| cta_link | TEXT | |
| start_date | DATE | |
| end_date | DATE | |
| is_active | BOOLEAN | |
| created_by | UUID | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

## Supabase Edge Functions

Located in `supabase/functions/`:

| Function | Purpose |
|----------|---------|
| `create-checkout-session` | Creates a Stripe Checkout Session |
| `stripe-webhook` | Handles Stripe webhook events |
| `sync-algolia` | Syncs room data to Algolia index |
| `sync-bookings` | Syncs booking data for availability |

## Supabase Configuration

### Backend Clients (`backend/src/config/supabase.js`)
- `supabase` — anon key client, respects RLS
- `supabaseAdmin` — service role key client, bypasses RLS (used for admin operations, cross-user queries)
- `getSupabaseClient(accessToken)` — creates per-request client scoped to user's JWT

### Frontend Client (`frontend/src/lib/supabaseClient.js`)
- Single anon key client for auth operations

## RLS Notes

- `offers` table has RLS enabled with read-all policy
- Backend mostly uses `supabaseAdmin` (service role) which bypasses RLS
- Frontend Supabase client uses anon key; auth operations go through backend API

## Indexes

Key indexes defined in migrations:
- `rooms`: property_type, place_type, instant_book, allows_pets, amenities (GIN), safety_features (GIN), owner_id
- `offers`: room_id, owner_id, (is_active + start_date + end_date), show_banner
- `special_offer_campaigns`: (is_active + start_date + end_date)
