import { supabase } from "./supabaseClient.js";

// Get the Supabase functions URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const FUNCTIONS_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : "";

/**
 * Call the Algolia sync edge function
 * @param {Object} params - Sync parameters
 * @param {string} params.type - Operation type: INSERT, UPDATE, DELETE, FULL_SYNC, CONFIGURE_INDEX
 * @param {Object} [params.record] - The room record (for INSERT/UPDATE)
 * @param {Object} [params.old_record] - The old record (for DELETE)
 */
export async function syncToAlgolia({ type, record, old_record }) {
  if (!FUNCTIONS_URL) {
    console.warn("Supabase URL not configured, skipping Algolia sync");
    return null;
  }

  try {
    // Get current session for auth
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${FUNCTIONS_URL}/sync-algolia`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
      },
      body: JSON.stringify({ type, record, old_record }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Algolia sync failed");
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
