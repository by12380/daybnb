const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠  SUPABASE_URL or SUPABASE_ANON_KEY is missing. Set them in backend/.env"
  );
}

/**
 * Public client – respects Row Level Security (RLS).
 * Use for operations scoped to the requesting user.
 */
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Admin client – bypasses RLS via the service-role key.
 * Use only for server-side operations that need elevated access
 * (e.g. webhook handlers, admin-only actions).
 */
const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

/**
 * Returns an RLS-scoped client that acts on behalf of the given JWT.
 * Call this from middleware after verifying the user's access token.
 */
function getSupabaseClient(accessToken) {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

module.exports = { supabase, supabaseAdmin, getSupabaseClient };
