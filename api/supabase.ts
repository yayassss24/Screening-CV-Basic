let _createClient: ((url: string, key: string) => any) | null = null;
let _sbLoadAttempted = false;

async function getCreateClient() {
  if (_sbLoadAttempted) return _createClient;
  _sbLoadAttempted = true;
  try {
    const mod = await import("@supabase/supabase-js");
    _createClient = mod.createClient;
    return _createClient;
  } catch (e: any) {
    console.warn("[SUPABASE] Failed to load @supabase/supabase-js:", e.message);
    return null;
  }
}

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

let client: any = null;
let initAttempted = false;

export async function getSupabase() {
  if (initAttempted) return client;
  initAttempted = true;
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[SUPABASE] Missing SUPABASE_URL or SUPABASE_ANON_KEY, using file fallback");
    return null;
  }
  const createClient = await getCreateClient();
  if (!createClient) return null;
  try {
    client = createClient(supabaseUrl, supabaseKey);
    return client;
  } catch (e: any) {
    console.error("[SUPABASE] Init error:", e.message);
    return null;
  }
}
