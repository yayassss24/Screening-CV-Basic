const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

let client: any = null;
let initAttempted = false;

export async function getSupabase() {
  if (initAttempted) return client;
  initAttempted = true;
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[SUPABASE] Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return null;
  }
  try {
    const mod = await import("@supabase/supabase-js");
    client = mod.createClient(supabaseUrl, supabaseKey);
    return client;
  } catch (e: any) {
    console.warn("[SUPABASE] Init error:", e.message);
    return null;
  }
}
