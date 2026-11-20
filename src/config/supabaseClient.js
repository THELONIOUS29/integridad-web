const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[IntegridadWeb] Configure SUPABASE_URL y SUPABASE_ANON_KEY en el archivo .env.");
}

// Control aplicado: Consultas seguras con cliente oficial Supabase
// Norma: ISO 27002:2022 8.28 / NIST SI-10
// Descripción: Se usa el Query Builder oficial para evitar concatenación manual de SQL.
const supabase = createClient(supabaseUrl || "https://example.supabase.co", supabaseAnonKey || "anon-key");

module.exports = supabase;
