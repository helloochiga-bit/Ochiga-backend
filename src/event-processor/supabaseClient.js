// src/event-processor/supabaseClient.js
const { createClient } = require("@supabase/supabase-js");

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  // Use service_role key for server-side writes
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { "x-oyi-service": "event-processor" } },
  });
}

module.exports = { createSupabaseClient };
