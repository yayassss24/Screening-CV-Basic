import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

let client: ReturnType<typeof createClient> | null = null;
let initAttempted = false;

export function getSupabase() {
  if (initAttempted) return client;
  initAttempted = true;
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[SUPABASE] Missing SUPABASE_URL or SUPABASE_ANON_KEY, using file fallback");
    return null;
  }
  try {
    client = createClient(supabaseUrl, supabaseKey);
    return client;
  } catch (e: any) {
    console.error("[SUPABASE] Init error:", e.message);
    return null;
  }
}

export function mustGetSupabase() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  return sb;
}
