import { supabase } from "./supabaseClient.js";

// Get the Supabase functions URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const FUNCTIONS_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : "";

/**
 * Call the Algolia sync edge function
 * @param {Object} params - Sync parameters
 * @param {string} params.type - Operation type: INSERT, UPDATE, DELETE, BOOKING_INSERT, BOOKING_UPDATE, BOOKING_DELETE, FULL_SYNC, CONFIGURE_INDEX
 * @param {Object} [params.record] - The room/booking record (for INSERT/UPDATE)
 * @param {Object} [params.old_record] - The old record (for DELETE)
 */
export async function syncToAlgolia({ type, record, old_record }) {
  if (!FUNCTIONS_URL) {
    console.warn("Supabase URL not configured, skipping Algolia sync");
    return null;
  }

  if (!supabase) {
    console.warn("Supabase client not configured, skipping Algolia sync");
    return null;
  }

  try {
    // Get current session for auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn("Failed to get session:", sessionError);
    }

    // Use the access token if available, otherwise use anon key
    const authToken = session?.access_token || SUPABASE_ANON_KEY;
    
    const response = await fetch(`${FUNCTIONS_URL}/sync-algolia`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ type, record, old_record }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || errorData.message || `Algolia sync failed (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error("Algolia sync error:", error);
    throw error;
  }
}

/**
 * Trigger a full sync of all rooms to Algolia
 */
export async function fullSyncToAlgolia() {
  return syncToAlgolia({ type: "FULL_SYNC" });
}

/**
 * Configure Algolia index settings
 */
export async function configureAlgoliaIndex() {
  return syncToAlgolia({ type: "CONFIGURE_INDEX" });
}

/**
 * Sync a single room to Algolia after insert
 */
export async function syncRoomInsert(room) {
  return syncToAlgolia({ type: "INSERT", record: room });
}

/**
 * Sync a single room to Algolia after update
 */
export async function syncRoomUpdate(room) {
  return syncToAlgolia({ type: "UPDATE", record: room });
}

/**
 * Remove a room from Algolia after delete
 */
export async function syncRoomDelete(roomId) {
  return syncToAlgolia({ type: "DELETE", old_record: { id: roomId } });
}

// =============================================
// Booking sync functions
// =============================================

/**
 * Sync booking creation to Algolia (updates room's booked_dates)
 * @param {Object} booking - The booking record with room_id
 */
export async function syncBookingInsert(booking) {
  if (!booking?.room_id) {
    console.warn("syncBookingInsert: No room_id in booking, skipping");
    return null;
  }
  return syncToAlgolia({ type: "BOOKING_INSERT", record: booking });
}

/**
 * Sync booking update to Algolia (updates room's booked_dates)
 * @param {Object} booking - The updated booking record with room_id
 * @param {Object} [oldBooking] - The old booking record (if room_id changed)
 */
export async function syncBookingUpdate(booking, oldBooking = null) {
  if (!booking?.room_id) {
    console.warn("syncBookingUpdate: No room_id in booking, skipping");
    return null;
  }
  
  // If room_id changed, we need to update both rooms
  if (oldBooking && oldBooking.room_id && oldBooking.room_id !== booking.room_id) {
    // Update the old room first
    await syncToAlgolia({ type: "BOOKING_DELETE", old_record: oldBooking });
  }
  
  return syncToAlgolia({ type: "BOOKING_UPDATE", record: booking });
}

/**
 * Sync booking deletion/cancellation to Algolia (updates room's booked_dates)
 * @param {Object} booking - The booking record with room_id
 */
export async function syncBookingDelete(booking) {
  if (!booking?.room_id) {
    console.warn("syncBookingDelete: No room_id in booking, skipping");
    return null;
  }
  return syncToAlgolia({ type: "BOOKING_DELETE", old_record: booking });
}
