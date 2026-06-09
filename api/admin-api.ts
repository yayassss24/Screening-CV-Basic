import { readFileSync, existsSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { getSupabase } from "./supabase";

const TMP_PATH = "/tmp/transactions.json";

let memTransactions: any[] | null = null;

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

async function readAllTransactions(): Promise<any[]> {
  if (memTransactions) return memTransactions;
  const sb = await getSupabase();
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
          codePlainForDb: t.code_plain_for_db,
          verified_at: t.verified_at,
        }));
        return memTransactions;
      }
    } catch (e: any) {
      console.log("[ADMIN-API] Supabase read error:", e.message);
    }
  }
  const fileTx = loadFileTransactions();
  if (fileTx.length > 0) {
    memTransactions = fileTx;
    return memTransactions;
  }
  return [];
}

async function saveTransactionToAll(tx: any, screenshotBase64?: string, screenshotMimeType?: string) {
  let savedTo = "file";
  const sb = await getSupabase();
  if (sb) {
    try {
      const { error } = await sb.from("transactions").insert({
        id: tx.id, email: tx.email, paket: tx.paket,
        nominal: tx.nominal, status: tx.status,
        created_at: tx.createdAt, resend_count: tx.resendCount || 0,
        verified_identity: tx.verifiedIdentity || false,
        has_screenshot: !!screenshotBase64,
        screenshot_base64: screenshotBase64 || null,
        screenshot_mime_type: screenshotMimeType || null,
      });
      if (!error) {
        savedTo = "supabase";
      }
    } catch (e: any) {
      console.log("[ADMIN-API] Supabase write error:", e.message);
    }
  }
  const all = loadFileTransactions();
  all.push(tx);
  saveFileTransactions(all);
  memTransactions = all;
  return savedTo;
}

async function readTransaction(id: string): Promise<any | null> {
  const all = await readAllTransactions();
  return all.find((t: any) => t.id === id) || null;
}

async function updateTransactionInAll(id: string, updates: Record<string, any>) {
  const sb = await getSupabase();
  if (sb) {
    try {
      await sb.from("transactions").update(updates).eq("id", id);
    } catch (e: any) {
      console.log("[ADMIN-API] Supabase update error:", e.message);
    }
  }
  const all = loadFileTransactions();
  const idx = all.findIndex((t: any) => t.id === id);
  if (idx === -1) {
    const initialTx = await readTransaction(id);
    if (initialTx) { all.push({ ...initialTx, ...updates }); }
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
      const nominal = paket === "PRO" ? 100000 : paket === "TRIAL" ? 10000 : 75000;
      const status = source === "cs_chatbot" ? "PENDING VERIFIKASI MANUAL" : "PENDING";

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
      };

      const savedTo = await saveTransactionToAll(tx, screenshotBase64, screenshotMimeType);

      res.setHeader("Content-Type", "application/json");
      res.status(200).end(JSON.stringify({ success: true, transactionId, paket, nominal, status, savedTo }));
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

    // GET /api/billing/admin/diag — diagnostic info
    if (req.method === "GET" && pathname === "/api/billing/admin/diag") {
      const sb = await getSupabase();
      res.setHeader("Content-Type", "application/json");
      res.status(200).end(JSON.stringify({
        mode: sb ? "supabase+file" : "file-only",
        supabaseConfigured: !!sb,
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


