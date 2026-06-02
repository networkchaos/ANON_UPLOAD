const { createClient } = require("@supabase/supabase-js");

let _client = null;

function getDB() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY; // service_role — never expose
  if (!url || !key) throw new Error("Supabase env vars missing");
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

module.exports = { getDB };
