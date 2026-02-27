import { supabase } from "./supabaseClient.js";

async function invokeFunction(functionName, body) {
  if (!supabase) {
    console.warn("Supabase client not configured, skipping Algolia sync");
    return null;
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
    const detail =
      data?.error || data?.details || data?.message ||
      (typeof data === "string" ? data : null);
    const msg = detail
      ? `${functionName}: ${detail}`
      : (error.message || `${functionName} call failed`);
    throw new Error(msg);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Call the Algolia sync edge function
 * @param {Object} params - Sync parameters
 * @param {string} params.type - Operation type: INSERT, UPDATE, DELETE, FULL_SYNC, CONFIGURE_INDEX, BOOKING_INSERT, BOOKING_UPDATE, BOOKING_DELETE
 * @param {Object} [params.record] - The room or booking record (for INSERT/UPDATE)
 * @param {Object} [params.old_record] - The old record (for DELETE/UPDATE)
 */
export async function syncToAlgolia({ type, record, old_record }) {
  return invokeFunction("sync-algolia", { type, record, old_record });
}

/**
 * Call the Algolia bookings sync edge function
 * @param {Object} params - Sync parameters
 * @param {string} params.type - Operation type: INSERT, UPDATE, DELETE, FULL_SYNC, CONFIGURE_INDEX
 * @param {Object} [params.record] - The booking record (for INSERT/UPDATE)
 * @param {Object} [params.old_record] - The old record (for DELETE)
 */
export async function syncBookingsToAlgolia({ type, record, old_record }) {
  return invokeFunction("sync-bookings", { type, record, old_record });
}

/**
 * Trigger a full sync of all bookings to Algolia
 */
export async function fullSyncBookingsToAlgolia() {
  return syncBookingsToAlgolia({ type: "FULL_SYNC" });
}

/**
 * Configure Algolia bookings index settings
 */
export async function configureAlgoliaBookingsIndex() {
  return syncBookingsToAlgolia({ type: "CONFIGURE_INDEX" });
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

/**
 * Sync a booking insert to Algolia
 */
export async function syncBookingInsert(booking) {
  return syncToAlgolia({ type: "BOOKING_INSERT", record: booking });
}

/**
 * Sync a booking update to Algolia
 */
export async function syncBookingUpdate(booking, oldBooking) {
  return syncToAlgolia({
    type: "BOOKING_UPDATE",
    record: booking,
    old_record: oldBooking,
  });
}

/**
 * Sync a booking delete/cancel to Algolia
 */
export async function syncBookingDelete(booking) {
  return syncToAlgolia({ type: "BOOKING_DELETE", old_record: booking });
}
