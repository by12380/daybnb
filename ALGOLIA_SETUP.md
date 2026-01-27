# Algolia GeoSearch + Supabase Sync (Daybnb)

Daybnb uses **Supabase as the source of truth** and keeps an **Algolia index** in sync for fast **GeoSearch** (nearby rooms + price/time filters).

## Environment variables

### Frontend (Vite)

Set these in `.env.local`:

- `VITE_ALGOLIA_APP_ID`
- `VITE_ALGOLIA_SEARCH_API_KEY` (Algolia *search-only* key)
- `VITE_ALGOLIA_ROOMS_INDEX` (default: `daybnb_rooms`)

### Supabase Edge Function (server-side)

Set these in Supabase Function secrets:

- `ALGOLIA_APP_ID`
- `ALGOLIA_ADMIN_API_KEY` (Algolia *admin* key; never expose to the browser)
- `ALGOLIA_ROOMS_INDEX` (default: `daybnb_rooms`)
- `DAYBNB_SYNC_SECRET` (optional but recommended)

## Supabase table requirements

Algolia GeoSearch requires latitude/longitude per room.

Run this in Supabase SQL editor:

```sql
alter table public.rooms
add column if not exists latitude double precision,
add column if not exists longitude double precision;
```

Then add coordinates in **Admin → Rooms**.

## Deploy the sync function

This repo includes `supabase/functions/algolia-rooms-sync/index.ts`.

Deploy it:

```bash
supabase functions deploy algolia-rooms-sync
```

## Keep Algolia in sync with `rooms`

Use a Supabase **Database Webhook** (recommended):

- Table: `rooms`
- Events: `INSERT`, `UPDATE`, `DELETE`
- URL: your deployed function URL for `algolia-rooms-sync`
- Header (recommended): `x-daybnb-sync-secret: <DAYBNB_SYNC_SECRET>`

The function expects a payload shaped like Supabase’s webhook payload:

- `type`: `INSERT` / `UPDATE` / `DELETE`
- `record`: new row
- `old_record`: old row (for deletes)

## Configure the Algolia index (optional but recommended)

Run:

```bash
node scripts/algoliaConfigure.mjs
```

## Backfill existing rooms into Algolia

Run:

```bash
node scripts/algoliaBackfill.mjs
```

Both scripts require:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALGOLIA_APP_ID`
- `ALGOLIA_ADMIN_API_KEY`
- `ALGOLIA_ROOMS_INDEX`

