const { supabaseAdmin } = require("../config/supabase");

/**
 * Fire-and-forget call to the sync-algolia Supabase Edge Function.
 * Errors are logged but never thrown — Algolia sync should never
 * block or break the primary API response.
 */
function invokeAlgoliaSync(body) {
  if (!supabaseAdmin) return;

  supabaseAdmin.functions
    .invoke("sync-algolia", { body })
    .then(({ error }) => {
      if (error) console.warn("[algolia-sync]", body.type, "error:", error.message);
    })
    .catch((err) => {
      console.warn("[algolia-sync]", body.type, "failed:", err.message);
    });
}

exports.syncRoomInsert = function syncRoomInsert(room) {
  invokeAlgoliaSync({ type: "INSERT", record: room });
};

exports.syncRoomUpdate = function syncRoomUpdate(room) {
  invokeAlgoliaSync({ type: "UPDATE", record: room });
};

exports.syncRoomDelete = function syncRoomDelete(roomId) {
  invokeAlgoliaSync({ type: "DELETE", old_record: { id: roomId } });
};

exports.syncBookingChange = function syncBookingChange(type, booking, oldBooking) {
  invokeAlgoliaSync({ type, record: booking, old_record: oldBooking });
};
