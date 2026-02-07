# Algolia GeoSearch Setup Guide

This guide explains how to set up Algolia GeoSearch for location-based search in Daybnb.

## Overview

Algolia provides fast, typo-tolerant search with built-in GeoSearch capabilities. The integration consists of:

1. **Algolia Index**: Stores room data with geo coordinates and booked dates
2. **Supabase Edge Function**: Syncs data between Supabase and Algolia (including booking data)
3. **React Components**: Search UI with location detection, availability filters, and price sorting
4. **Booking Sync**: Automatic updates to Algolia when bookings are created, updated, or cancelled

## Prerequisites

- An Algolia account (free tier available at [algolia.com](https://www.algolia.com))
- Supabase project with rooms table
- Rooms table should have `latitude` and `longitude` columns for GeoSearch

## Step 1: Create Algolia Account & Application

1. Sign up at [algolia.com](https://www.algolia.com)
2. Create a new Application
3. Note your credentials:
   - **Application ID**: Found in Settings > API Keys
   - **Search-Only API Key**: Safe for frontend use
   - **Admin API Key**: For backend sync operations (keep secret!)

## Step 2: Configure Environment Variables

### Frontend (.env or .env.local)

```env
VITE_ALGOLIA_APP_ID=your_application_id
VITE_ALGOLIA_SEARCH_KEY=your_search_only_api_key
VITE_ALGOLIA_INDEX_NAME=daybnb_places
```

### Supabase Edge Functions (Supabase Dashboard > Edge Functions > Secrets)

```
ALGOLIA_APP_ID=your_application_id
ALGOLIA_ADMIN_KEY=your_admin_api_key
ALGOLIA_INDEX_NAME=daybnb_places
```

## Step 3: Update Supabase Rooms Table

Add geo coordinates to your rooms table:

```sql
-- Add latitude and longitude columns to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Example: Update existing rooms with coordinates
UPDATE rooms SET latitude = 15.2993, longitude = 74.1240 WHERE location = 'Goa';
UPDATE rooms SET latitude = 26.9124, longitude = 75.7873 WHERE location = 'Jaipur';
UPDATE rooms SET latitude = 36.8969, longitude = 30.7133 WHERE location = 'Antalya';
UPDATE rooms SET latitude = 12.9716, longitude = 77.5946 WHERE location = 'Bengaluru';
UPDATE rooms SET latitude = 19.0760, longitude = 72.8777 WHERE location = 'Mumbai';
UPDATE rooms SET latitude = 24.5854, longitude = 73.7125 WHERE location = 'Udaipur';
UPDATE rooms SET latitude = 30.0869, longitude = 78.2676 WHERE location = 'Rishikesh';
UPDATE rooms SET latitude = 7.8804, longitude = 98.3923 WHERE location = 'Phuket';
```

## Step 4: Deploy the Sync Edge Function

Deploy the `sync-algolia` edge function to Supabase:

```bash
# From project root
supabase functions deploy sync-algolia
```

## Step 5: Initial Data Sync

After deploying, perform an initial sync to populate Algolia:

### Option A: Via API Call

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-algolia' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{"type": "FULL_SYNC"}'
```

### Option B: Configure Index Settings

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-algolia' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{"type": "CONFIGURE_INDEX"}'
```

## Step 6: Set Up Database Triggers (Optional)

For automatic sync when rooms are added/updated/deleted, create a database webhook or trigger:

### Using Supabase Database Webhooks

1. Go to Supabase Dashboard > Database > Webhooks
2. Create a new webhook:
   - **Name**: `sync-rooms-to-algolia`
   - **Table**: `rooms`
   - **Events**: INSERT, UPDATE, DELETE
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-algolia`
   - **HTTP Headers**: Add `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`

### Webhook Payload Format

The webhook should send:

```json
{
  "type": "INSERT",  // or "UPDATE" or "DELETE"
  "record": { ... }, // The new/updated record
  "old_record": { ... } // For DELETE operations
}
```

## Step 7: Verify Setup

1. Check Algolia Dashboard > Indices to see your `daybnb_places` index
2. Verify records have `_geoloc` field with `lat` and `lng`
3. Test search in your app - results should come from Algolia

## Algolia Index Configuration

The sync function configures these settings:

```javascript
{
  searchableAttributes: [
    "title",
    "location", 
    "description",
    "tags",
    "type"
  ],
  attributesForFaceting: [
    "filterOnly(price_per_hour)",
    "filterOnly(guests)",
    "filterOnly(booked_dates)",  // For availability filtering
    "searchable(type)",
    "searchable(tags)",
    "searchable(location)"
  ],
  customRanking: ["desc(price_per_hour)"],
  hitsPerPage: 20,
  // Replica indices for sorting
  replicas: [
    "daybnb_places_price_asc",
    "daybnb_places_price_desc"
  ]
}
```

### Replica Indices for Price Sorting

Two replica indices are created for sorting by price:
- `daybnb_places_price_asc`: Sort by price low to high
- `daybnb_places_price_desc`: Sort by price high to low

## GeoSearch Features

### Location-Based Search
- Users can click "Use my location" to enable geo-based results
- Results are sorted by distance when location is enabled
- Configurable search radius (5km to 200km)

### Filters
- **Date**: Select booking date (with availability filtering via Algolia)
- **Hide Booked Rooms**: Toggle to filter out rooms that are booked on the selected date
- **Time Range**: 8 AM - 5 PM daytime hours
- **Price**: Min/max hourly price
- **Room Type**: Filter by suite, resort, villa, etc.
- **Guests**: Minimum guest capacity

### Sorting
- **Relevance**: Default Algolia ranking
- **Price: Low to High**: Sort by cheapest first
- **Price: High to Low**: Sort by most expensive first

## Booking Availability Integration

### How It Works

1. Each room record in Algolia contains a `booked_dates` array with numeric date values (YYYYMMDD format)
2. When a user selects a date, Algolia filters out rooms where `booked_dates` contains that date
3. This provides instant, scalable availability filtering without hitting the database

### Data Structure

Room records in Algolia now include:
```javascript
{
  objectID: "room-uuid",
  title: "Luxury Suite",
  // ... other fields ...
  booked_dates: [20260201, 20260202, 20260215],  // Numeric format for filtering
  booked_dates_iso: ["2026-02-01", "2026-02-02", "2026-02-15"]  // ISO format for display
}
```

### Booking Sync Events

When bookings are created, updated, or cancelled, the room's `booked_dates` are automatically updated in Algolia:

| Event | Action |
|-------|--------|
| Booking Created | Add date to room's `booked_dates` |
| Booking Updated | Update dates if booking date changed |
| Booking Cancelled | Remove date from room's `booked_dates` |
| Booking Approved | Keep date in `booked_dates` |
| Booking Rejected | Remove date from `booked_dates` |

### Sync Function Types

The sync function now supports these additional operations:

| Type | Description |
|------|-------------|
| `BOOKING_INSERT` | Sync when a booking is created |
| `BOOKING_UPDATE` | Sync when a booking is updated |
| `BOOKING_DELETE` | Sync when a booking is cancelled/deleted |

## Troubleshooting

### "Search Not Configured" Message
- Verify `VITE_ALGOLIA_APP_ID` and `VITE_ALGOLIA_SEARCH_KEY` are set
- Restart dev server after adding env variables

### No Results Showing
- Check Algolia Dashboard to verify index has records
- Run `FULL_SYNC` to populate the index
- Verify rooms have latitude/longitude values

### GeoSearch Not Working
- Ensure rooms have valid `latitude` and `longitude` values
- Check that `_geoloc` field exists in Algolia records
- Browser must allow location access for "Use my location"

### Sync Errors
- Verify `ALGOLIA_ADMIN_KEY` is set in Supabase secrets
- Check Edge Function logs in Supabase Dashboard

## API Reference

### Sync Function Endpoints

| Type | Description |
|------|-------------|
| `INSERT` | Add a new room to Algolia |
| `UPDATE` | Update an existing room |
| `DELETE` | Remove a room from Algolia |
| `BOOKING_INSERT` | Sync room after booking creation |
| `BOOKING_UPDATE` | Sync room after booking update |
| `BOOKING_DELETE` | Sync room after booking cancellation |
| `FULL_SYNC` | Sync all rooms from Supabase (includes booking data) |
| `CONFIGURE_INDEX` | Set up index settings and replicas |

### Example Sync Calls

```javascript
import { 
  fullSyncToAlgolia, 
  configureAlgoliaIndex,
  syncBookingInsert,
  syncBookingUpdate,
  syncBookingDelete 
} from './lib/algoliaSync.js';

// Sync all rooms with booking data
await fullSyncToAlgolia();

// Configure index settings and create sorting replicas
await configureAlgoliaIndex();

// Sync after booking operations
await syncBookingInsert(bookingRecord);
await syncBookingUpdate(updatedBooking, oldBooking);
await syncBookingDelete(bookingRecord);
```

### Automatic Booking Sync

Booking sync is automatically called in these components:
- `src/guest/pages/Booking.jsx` - On booking creation
- `src/guest/pages/MyBookings.jsx` - On booking edit/cancel
- `src/admin/pages/Bookings.jsx` - On admin edit/delete/approve/reject

## Security Notes

- **Search Key**: Safe for frontend, read-only access
- **Admin Key**: Backend only, never expose in frontend code
- Use Supabase Edge Functions for admin operations
- RLS policies still apply to Supabase data
