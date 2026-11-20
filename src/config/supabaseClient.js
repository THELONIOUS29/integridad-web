const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
let isServerKey = /^sb_secret_[A-Za-z0-9_-]{20,}$/.test(serverKey);
if (!isServerKey && serverKey.split(".").length === 3) {
  try {
    const payload = JSON.parse(Buffer.from(serverKey.split(".")[1], "base64url").toString("utf8"));
    isServerKey = payload.role === "service_role";
  } catch { isServerKey = false; }
}
if (!supabaseUrl || !/^https:\/\//.test(supabaseUrl) || !isServerKey) {
  throw new Error("Configure SUPABASE_URL y una clave privada de servidor en SUPABASE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY.");
}

// Cliente exclusivo del servidor. Nunca exportar esta clave al navegador o al repositorio.
module.exports = createClient(supabaseUrl, serverKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
