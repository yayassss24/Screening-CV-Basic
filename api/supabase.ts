const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

let client: any = null;
let initDone = false;

export async function getSupabase() {
  if (initDone) return client;
  initDone = true;
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const mod = await import("@supabase/supabase-js");
    client = mod.createClient(supabaseUrl, supabaseKey);
    return client;
  } catch {
    return null;
  }
}
