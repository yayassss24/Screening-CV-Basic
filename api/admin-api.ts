import { readFileSync, existsSync, writeFileSync } from "fs";
import { createHash } from "crypto";

const TMP_PATH = "/tmp/transactions.json";
const NOMINAL_MAP: Record<string, number> = { BASIC: 75000, PRO: 100000, TRIAL: 10000 };
const BANK_NAMES = /(BCA|BNI|MANDIRI|BRI|CIMB|NIAGA|DANAMON|PERMATA|MAYBANK|OCBC|BTN|PANIN|BUKOPIN|JAGO|JENIUS|DIGITAL|BSI|MUAMALAT|SYARIAH|MEGA|BTPN|NOBU|ARTHA|BISNIS|MASPION|HANA|COMMONWEALTH|BANK\s*(\w+))/i;
const DATE_PATTERNS = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{1,2}\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des|Januari|Februari|Maret|April|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{2,4})/i;
const SUCCESS_KEYWORDS = /(BERHASIL|SUKSES|TERIMA|DITERIMA|SELESAI)/i;
const FAIL_KEYWORDS = /(GAGAL|DITOLAK|PENDING|BATAL|GAGAL|TERSANDING|MENUNGGU|PROSES|DIPROSES|CADANGAN|TERTUNDA)/i;

let memTransactions: any[] | null = null;

function generateActivationCode(paket: string) {
  const chars = "0123456789";
  const genPart = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `JCV-${paket}-${genPart()}-${genPart()}`;
}

function screenshotHash(base64: string): string {
  return createHash("sha256").update(base64).digest("hex");
}

async function autoVerifyScreenshot(base64: string, paket: string): Promise<{ ok: boolean; reason?: string }> {
  const timeout = new Promise<{ ok: false; reason: string }>((_, reject) =>
    setTimeout(() => reject(new Error("OCR timeout")), 12000)
  );
  const verify = (async () => {
    try {
      const buffer = Buffer.from(base64, "base64");
      if (buffer.length < 100) return { ok: false, reason: "Gambar terlalu kecil atau tidak valid." };
      const header = buffer.slice(0, 8).toString("hex");
      const isValidImage = header.startsWith("89504e47") || header.startsWith("ffd8") || header.startsWith("52494646");
      if (!isValidImage) return { ok: false, reason: "Format gambar tidak didukung. Silakan hubungi CS JagoCV untuk informasi lebih lanjut." };

      // 1) Cek duplikat screenshot (hash vs semua transaksi existing)
      const hash = screenshotHash(base64);
      const allTx = await readAllTransactions();
      for (const t of allTx) {
        if ((t.screenshotHash && t.screenshotHash === hash) || (t.screenshotBase64 && screenshotHash(t.screenshotBase64) === hash)) {
          return { ok: false, reason: "Mohon maaf, gambar bukti bayar ini sudah terdaftar di transaksi sebelumnya. Silakan hubungi CS JagoCV untuk bantuan." };
        }
      }

      const expected = NOMINAL_MAP[paket] || 0;
      let ocrText = "";
      let ocrConfidence = 0;

      // 2) OCR Service (Railway) — fastest, unlimited, no cold start
      const ocrServiceUrl = process.env.OCR_SERVICE_URL;
      if (ocrServiceUrl) {
        try {
          const resp = await fetch(`${ocrServiceUrl}/ocr`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64, language: "ind+eng" }),
            signal: AbortSignal.timeout(15000),
          });
          if (resp.ok) {
            const result = await resp.json();
            ocrText = result.text || "";
            ocrConfidence = result.confidence || 0;
          }
        } catch {}
      }

      // 3) Fallback: local Tesseract.js OCR
      if (!ocrText) {
        try {
          const mod = await import("tesseract.js");
          const worker = await mod.createWorker("ind+eng");
          const { data } = await worker.recognize(buffer);
          await worker.terminate();
          ocrText = data.text || "";
          ocrConfidence = data.confidence || 0;
        } catch {}
      }

      // 4) Last resort: Gemini AI Vision (API call)
      if (!ocrText) {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_PAYMENT;
        if (apiKey) {
          try {
            const { GoogleGenAI } = await import("@google/genai");
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Analisis bukti transfer bank ini. Berikan RESPON JSON SAJA (tanpa markdown, tanpa kutip penjelasan):
{
  "valid": boolean,
  "nominal_detected": number | null,
  "nominal_tepat": boolean,
  "nominal_kurang": boolean,
  "nominal_lebih": boolean,
  "status_transfer": "BERHASIL" | "GAGAL" | "PENDING" | "TIDAK_TERDETEKSI",
  "bank_terdeteksi": string | null,
  "tanggal_terdeteksi": string | null,
  "adalah_qris": boolean,
  "gambar_buram": boolean,
  "alasan_penolakan": string | null
}
Aturan:
- valid=true hanya jika nominal TEPAT Rp ${expected.toLocaleString("id-ID")}, status BERHASIL, bukan QRIS, dan gambar jelas.
- nominal_kurang=true jika nominal terdeteksi < ${expected}.
- nominal_lebih=true jika nominal terdeteksi > ${expected}.
- Jika gambar adalah QRIS, set adalah_qris=true dan valid=false.
- Jika gambar buram/tidak terbaca, set gambar_buram=true dan valid=false.
- alasan_penolakan harus jelas dalam Bahasa Indonesia.`;

            const response = await ai.models.generateContent({
              model: "gemini-2.0-flash",
              contents: [{
                role: "user",
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType: "image/png", data: base64 } }
                ]
              }]
            });

            const resultText = response.text || "";
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.valid === true) return { ok: true, screenshotHash: hash };
              const reason = parsed.alasan_penolakan || (
                parsed.adalah_qris ? "Gambar yang diunggah terdeteksi sebagai kode QR, bukan bukti transfer. Silakan hubungi CS JagoCV untuk informasi lebih lanjut." :
                parsed.gambar_buram ? "Gambar bukti bayar kurang jelas sehingga nominal tidak terbaca. Silakan hubungi CS JagoCV untuk bantuan." :
                parsed.nominal_kurang ? `Nominal yang terdeteksi Rp ${parsed.nominal_detected?.toLocaleString("id-ID")} lebih kecil dari harga paket ${paket} (Rp ${expected.toLocaleString("id-ID")}). Silakan hubungi CS JagoCV untuk bantuan.` :
                parsed.nominal_lebih ? `Nominal yang terdeteksi Rp ${parsed.nominal_detected?.toLocaleString("id-ID")} lebih besar dari harga paket ${paket} (Rp ${expected.toLocaleString("id-ID")}). Silakan hubungi CS JagoCV untuk bantuan.` :
                parsed.status_transfer === "GAGAL" || parsed.status_transfer === "PENDING" ? "Transaksi pada bukti yang diunggah berstatus gagal/pending, bukan berhasil. Silakan hubungi CS JagoCV untuk bantuan." :
                `Nominal Rp ${expected.toLocaleString("id-ID")} tidak ditemukan pada gambar. Silakan hubungi CS JagoCV untuk bantuan.`
              );
              return { ok: false, reason };
            }
          } catch {}
        }
      }

      // Parse OCR result
      if (!ocrText) return { ok: false, reason: "Mohon maaf, gambar bukti bayar tidak terbaca. Silakan hubungi CS JagoCV untuk bantuan." };
      if (ocrConfidence < 30 && ocrText.length < 20) {
        return { ok: false, reason: "Gambar bukti bayar kurang jelas. Silakan hubungi CS JagoCV untuk bantuan." };
      }
      if (/QRIS|qris|GRIS|gris|(?<!\w)QR(?!\w)|(?<!\w)GR(?!\w)/i.test(ocrText)) {
        return { ok: false, reason: "Gambar yang diunggah terdeteksi sebagai kode QR, bukan bukti transfer. Silakan hubungi CS JagoCV untuk informasi lebih lanjut." };
      }

      const hasFailWord = FAIL_KEYWORDS.test(ocrText);
      const hasSuccessWord = SUCCESS_KEYWORDS.test(ocrText);
      if (hasFailWord && !hasSuccessWord) {
        return { ok: false, reason: "Transaksi pada bukti yang diunggah berstatus gagal/pending, bukan berhasil. Silakan hubungi CS JagoCV untuk bantuan." };
      }

      const nominalMatches = [...ocrText.matchAll(/Rp\s*([0-9.,]+)/gi)];
      let foundExact = false;
      let allDetectedNominals: string[] = [];

      for (const m of nominalMatches) {
        const raw = m[1].replace(/\./g, "").replace(/,/g, "");
        const amount = parseInt(raw, 10);
        if (!isNaN(amount)) {
          allDetectedNominals.push(m[0]);
          if (amount === expected) foundExact = true;
        }
      }

      if (!foundExact) {
        if (allDetectedNominals.length > 0) {
          for (const m of nominalMatches) {
            const raw = m[1].replace(/\./g, "").replace(/,/g, "");
            const amount = parseInt(raw, 10);
            if (!isNaN(amount)) {
              if (amount < expected) return { ok: false, reason: `Nominal yang terdeteksi ${m[0]} lebih kecil dari harga paket ${paket} (Rp ${expected.toLocaleString("id-ID")}). Silakan hubungi CS JagoCV untuk bantuan.` };
              if (amount > expected) return { ok: false, reason: `Nominal yang terdeteksi ${m[0]} lebih besar dari harga paket ${paket} (Rp ${expected.toLocaleString("id-ID")}). Silakan hubungi CS JagoCV untuk bantuan.` };
            }
          }
          return { ok: false, reason: `Nominal Rp ${expected.toLocaleString("id-ID")} tidak ditemukan pada gambar. Terdeteksi: ${allDetectedNominals.join(", ")}. Silakan hubungi CS JagoCV untuk bantuan.` };
        }
        return { ok: false, reason: `Nominal Rp ${expected.toLocaleString("id-ID")} tidak terbaca pada gambar. Silakan hubungi CS JagoCV untuk bantuan.` };
      }

      return { ok: true, screenshotHash: hash };
    } catch (e: any) {
      return { ok: false, reason: `OCR error: ${e.message}` };
    }
  })();

  return Promise.race([verify, timeout])
    .catch(() => ({ ok: false, reason: "OCR timeout" }));
}

function loadFileTransactions(): any[] {
  if (!existsSync(TMP_PATH)) return [];
  try { return JSON.parse(readFileSync(TMP_PATH, "utf-8")).transactions || []; }
  catch { return []; }
}

function saveFileTransactions(txns: any[]) {
  try {
    writeFileSync(TMP_PATH, JSON.stringify({ transactions: txns }, null, 2), "utf-8");
  } catch {}
}

async function getSupabaseClient() {
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
  const supabaseKey = process.env.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const mod = await import("@supabase/supabase-js");
    return mod.createClient(supabaseUrl, supabaseKey);
  } catch {
    return null;
  }
}

async function readAllTransactions(): Promise<any[]> {
  if (memTransactions) return memTransactions;
  // 1) Load from file first (fastest, has full screenshot data)
  const fileTx = loadFileTransactions();
  if (fileTx.length > 0) {
    memTransactions = fileTx;
    // 2) Enrich with Supabase data in background (won't affect current request)
    const sb = await getSupabaseClient();
    if (sb) {
      try {
        const { data, error } = await sb
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          const supaMap = new Map(data.map((t: any) => [t.id, t]));
          for (const tx of memTransactions) {
            const s = supaMap.get(tx.id);
            if (s) {
              if (!tx.screenshotBase64 && s.screenshot_base64) tx.screenshotBase64 = s.screenshot_base64;
              if (!tx.screenshotMimeType && s.screenshot_mime_type) tx.screenshotMimeType = s.screenshot_mime_type;
              if (s.verified_at && !tx.verified_at) tx.verified_at = s.verified_at;
              if (s.code_plain_for_db && !tx.codePlainForDb) tx.codePlainForDb = s.code_plain_for_db;
            }
          }
          saveFileTransactions(memTransactions);
        }
      } catch {}
    }
    return memTransactions;
  }
  // 3) Fallback: load from Supabase directly
  const sb = await getSupabaseClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        memTransactions = data.map((t: any) => ({
          id: t.id, email: t.email, paket: t.paket,
          nominal: t.nominal, status: t.status,
          createdAt: t.created_at, resendCount: t.resend_count,
          verifiedIdentity: t.verified_identity,
          hasScreenshot: t.has_screenshot,
          screenshotBase64: t.screenshot_base64,
          screenshotMimeType: t.screenshot_mime_type,
          screenshotHash: t.screenshot_hash,
          codePlainForDb: t.code_plain_for_db,
          verified_at: t.verified_at,
        }));
        saveFileTransactions(memTransactions);
        return memTransactions;
      }
    } catch {}
  }
  return [];
}

async function saveTransactionToAll(tx: any, screenshotBase64?: string, screenshotMimeType?: string) {
  const sb = await getSupabaseClient();
  if (sb) {
    try {
      await sb.from("transactions").insert({
        id: tx.id, email: tx.email, paket: tx.paket,
        nominal: tx.nominal, status: tx.status,
        created_at: tx.createdAt, resend_count: tx.resendCount || 0,
        verified_identity: tx.verifiedIdentity || false,
        has_screenshot: !!screenshotBase64,
        screenshot_base64: screenshotBase64 || null,
        screenshot_mime_type: screenshotMimeType || null,
        screenshot_hash: tx.screenshotHash || null,
        code_plain_for_db: tx.codePlainForDb || null,
        verified_at: tx.verified_at || null,
        ai_reason: tx.ai_reason || null,
      } as any);
    } catch {}
  }
  const all = loadFileTransactions();
  all.push(tx);
  saveFileTransactions(all);
  memTransactions = all;
}

async function readTransaction(id: string): Promise<any | null> {
  const all = await readAllTransactions();
  return all.find((t: any) => t.id === id) || null;
}

async function updateTransactionInAll(id: string, updates: Record<string, any>) {
  const sb = await getSupabaseClient();
  if (sb) {
    try {
      const supaUpdates: Record<string, any> = {};
      if (updates.status !== undefined) supaUpdates.status = updates.status;
      if (updates.verified_at !== undefined) supaUpdates.verified_at = updates.verified_at;
      if (updates.codePlainForDb !== undefined) supaUpdates.code_plain_for_db = updates.codePlainForDb;
      await sb.from("transactions").update(supaUpdates).eq("id", id);
    } catch {}
  }
  const all = loadFileTransactions();
  const idx = all.findIndex((t: any) => t.id === id);
  if (idx === -1) {
    const initialTx = await readTransaction(id);
    if (initialTx) all.push({ ...initialTx, ...updates });
  } else {
    all[idx] = { ...all[idx], ...updates };
  }
  saveFileTransactions(all);
  memTransactions = all;
}

function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: any) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export default async function handler(req: any, res: any) {
  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // POST /api/billing/create-transaction — CS Chatbot upload bukti bayar
    if (req.method === "POST" && pathname === "/api/billing/create-transaction") {
      const body = JSON.parse(await readBody(req));
      const { email, paket, source, screenshotBase64, screenshotMimeType } = body;

      if (!email || (paket !== "BASIC" && paket !== "PRO" && paket !== "TRIAL")) {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Email dan paket yang valid (BASIC, PRO, atau TRIAL) wajib disertakan." }));
        return;
      }

      const transactionId = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const nominal = NOMINAL_MAP[paket] || 75000;

      // Auto-verify with OCR if screenshot provided
      let status: string;
      let codePlainForDb: string | null = null;
      let verified_at: string | null = null;
      let ai_reason: string | null = null;

      if (source === "cs_chatbot" && screenshotBase64) {
        const result = await autoVerifyScreenshot(screenshotBase64, paket);
        if (result.ok) {
          status = "PAID";
          codePlainForDb = generateActivationCode(paket);
          verified_at = new Date().toISOString();
        } else if (result.reason === "OCR timeout") {
          status = "PENDING VERIFIKASI MANUAL";
          ai_reason = null;
        } else {
          status = "FAILED";
          ai_reason = result.reason || null;
        }
      } else {
        status = "PENDING VERIFIKASI MANUAL";
      }

      const tx = {
        id: transactionId,
        email: email.trim().toLowerCase(),
        paket,
        nominal,
        status,
        createdAt: new Date().toISOString(),
        resendCount: 0,
        verifiedIdentity: false,
        hasScreenshot: !!screenshotBase64,
        screenshotBase64: screenshotBase64 || null,
        screenshotMimeType: screenshotMimeType || null,
        screenshotHash: screenshotBase64 ? screenshotHash(screenshotBase64) : null,
        codePlainForDb,
        verified_at,
        ai_reason,
      };

      const savedTo = await saveTransactionToAll(tx, screenshotBase64, screenshotMimeType);

      res.setHeader("Content-Type", "application/json");
      res.status(200).end(JSON.stringify({
        success: true, transactionId, paket, nominal, status,
        codePlainForDb, ai_reason, savedTo,
      }));
      return;
    }

    // GET /api/billing/transactions — polling user transactions (CS chatbot)
    if (req.method === "GET" && pathname === "/api/billing/transactions") {
      const email = (url.searchParams.get("email") || "").trim().toLowerCase();
      if (!email) {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Email wajib" }));
        return;
      }
      const allTx = await readAllTransactions();
      const userTx = allTx
        .filter((t: any) => t.email === email)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.setHeader("Content-Type", "application/json");
      res.status(200).end(JSON.stringify({ success: true, transactions: userTx }));
      return;
    }

    // GET /api/billing/admin/diag
    if (req.method === "GET" && pathname === "/api/billing/admin/diag") {
      const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
      const supabaseKeySet = !!process.env.SUPABASE_ANON_KEY;
      let supabaseStatus = "not-attempted";
      try {
        const mod = await import("@supabase/supabase-js");
        if (mod && mod.createClient) {
          const sb = mod.createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || "");
          const { count, error } = await sb.from("transactions").select("*", { count: "exact", head: true });
          supabaseStatus = error ? `supa-error: ${error.message}` : "connected";
        } else {
          supabaseStatus = "createClient-not-found";
        }
      } catch (e: any) {
        supabaseStatus = `import-error: ${e.message}`;
      }
      res.setHeader("Content-Type", "application/json");
      res.status(200).end(JSON.stringify({
        mode: "file-only",
        supabaseUrl: supabaseUrl.substring(0, 40),
        supabaseKeySet,
        supabaseStatus,
        geminiKeySet: !!(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_PAYMENT),
        ocrServiceUrlSet: !!process.env.OCR_SERVICE_URL,
        memTransactionsCount: memTransactions?.length || 0,
        tmpTransactionsExists: existsSync(TMP_PATH),
      }));
      return;
    }

    // GET /api/billing/admin/transactions
    if (req.method === "GET" && pathname === "/api/billing/admin/transactions") {
      const allTx = (await readAllTransactions())
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((tx: any) => ({
          ...tx,
          hasScreenshot: !!(tx as any).hasScreenshot || !!tx.screenshotBase64,
          screenshotBase64: undefined,
        }));
      res.setHeader("Content-Type", "application/json");
      res.status(200).end(JSON.stringify({ success: true, transactions: allTx }));
      return;
    }

    // GET /api/billing/admin/screenshot/:transactionId
    if (req.method === "GET" && pathname.startsWith("/api/billing/admin/screenshot/")) {
      const txId = decodeURIComponent(pathname.split("/").pop() || "");
      const tx = await readTransaction(txId);
      if (!tx || !tx.screenshotBase64) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Screenshot tidak ditemukan" }));
        return;
      }
      const mime = tx.screenshotMimeType || "image/png";
      const img = Buffer.from(tx.screenshotBase64, "base64");
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Length", img.length.toString());
      res.status(200).end(img);
      return;
    }

    // POST /api/billing/admin/confirm-manual
    if (req.method === "POST" && pathname === "/api/billing/admin/confirm-manual") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const { transactionId } = JSON.parse(body);
      if (!transactionId) {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "transactionId wajib" }));
        return;
      }
      let tx = await readTransaction(transactionId);
      if (!tx) {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Transaksi tidak ditemukan" }));
        return;
      }
      tx.status = "PAID";
      tx.verified_at = new Date().toISOString();

      // Generate activation code
      const chars = "0123456789";
      const genPart = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const activationCode = `JCV-${tx.paket}-${genPart()}-${genPart()}`;
      const hash = createHash("sha256").update(activationCode).digest("hex");
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);
      const expireSub = new Date();
      expireSub.setDate(expireSub.getDate() + 30);

      await updateTransactionInAll(tx.id, {
        status: "PAID",
        verified_at: tx.verified_at,
        codePlainForDb: activationCode,
      });

      res.setHeader("Content-Type", "application/json");
      res.status(200).end(JSON.stringify({ success: true, message: "Transaksi dikonfirmasi" }));
      return;
    }

    // POST /api/billing/admin/reject
    if (req.method === "POST" && pathname === "/api/billing/admin/reject") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const { transactionId } = JSON.parse(body);
      if (!transactionId) {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "transactionId wajib" }));
        return;
      }
      let tx = await readTransaction(transactionId);
      if (!tx) {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Transaksi tidak ditemukan" }));
        return;
      }

      await updateTransactionInAll(tx.id, {
        status: "FAILED",
        verified_at: new Date().toISOString(),
      });

      res.setHeader("Content-Type", "application/json");
      res.status(200).end(JSON.stringify({ success: true, message: "Transaksi ditolak" }));
      return;
    }

    // 404 for unmatched admin API routes
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: err.message }));
  }
}


