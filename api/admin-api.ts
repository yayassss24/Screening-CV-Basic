import { readFileSync, existsSync } from "fs";
import { join } from "path";
import crypto from "crypto";

const DB_PATH = join(process.cwd(), "db.json");
const TMP_PATH = join("/tmp", "transactions.json");

// In-memory cache (survives within same serverless instance)
let memTransactions: any[] | null = null;
let firestoreDb: any = null;
let fsInitDone = false;

function loadFileTransactions(): any[] {
  const p = existsSync(TMP_PATH) ? TMP_PATH : DB_PATH;
  if (!existsSync(p)) return [];
  try { return JSON.parse(readFileSync(p, "utf-8")).transactions || []; }
  catch { return []; }
}

function saveFileTransactions(txns: any[]) {
  try {
    const { writeFileSync } = require("fs");
    writeFileSync(TMP_PATH, JSON.stringify({ transactions: txns }, null, 2), "utf-8");
  } catch {}
}

async function initFirestore() {
  if (fsInitDone) return firestoreDb;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!sa) return null;
  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    if (!getApps().length) {
      initializeApp({ credential: cert(JSON.parse(sa)) });
    }
    firestoreDb = getFirestore();
    fsInitDone = true;
    return firestoreDb;
  } catch {
    return null;
  }
}

async function readAllTransactions(): Promise<any[]> {
  if (memTransactions) return memTransactions;
  const db = await initFirestore();
  if (db) {
    try {
      const snap = await db.collection("transactions").get();
      const txns: any[] = [];
      snap.forEach((doc: any) => txns.push({ id: doc.id, ...doc.data() }));
      memTransactions = txns;
      return memTransactions;
    } catch (e: any) {
      console.log("[ADMIN-API] Firestore read error:", e.message);
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
  const db = await initFirestore();
  if (db) {
    try {
      await db.collection("transactions").doc(tx.id).set(tx);
      if (screenshotBase64) {
        await db.collection("screenshots").doc(tx.id).set({ screenshotBase64, screenshotMimeType: screenshotMimeType || "image/png" });
      }
      savedTo = "firestore";
    } catch (e: any) {
      console.log("[ADMIN-API] Firestore write error:", e.message);
    }
  }
  // Always save to file fallback too (admin may read from /tmp when Firestore read quota exceeded)
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
  const db = await initFirestore();
  if (db) {
    try {
      await db.collection("transactions").doc(id).update(updates);
    } catch (e: any) {
      console.log("[ADMIN-API] Firestore update error:", e.message);
    }
  }
  // Always update file + in-memory too
  const all = loadFileTransactions();
  const idx = all.findIndex((t: any) => t.id === id);
  if (idx === -1) {
    // Not in file cache yet; try to rebuild from Firestore (if available) or seed from db.json
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
      const db = await initFirestore();
      const saExists = !!process.env.FIREBASE_SERVICE_ACCOUNT;
      const saLen = (process.env.FIREBASE_SERVICE_ACCOUNT || "").length;
      const dbJsonExists = existsSync(DB_PATH);
      let firestoreGetError: string | null = null;
      let firestoreSetError: string | null = null;
      if (db) {
        try {
          await db.collection("_diag_test").doc("_test").get();
        } catch (e: any) {
          firestoreGetError = e.message;
        }
        try {
          await db.collection("_diag_test").doc("_test").set({ ts: Date.now() });
        } catch (e: any) {
          firestoreSetError = e.message;
        }
      }
      res.setHeader("Content-Type", "application/json");
      res.status(200).end(JSON.stringify({
        firebaseConfigured: saExists,
        firebaseServiceAccountLength: saLen,
        firestoreDbReady: !!db,
        fsInitDone,
        dbJsonPath: DB_PATH,
        dbJsonExists,
        firestoreGetError,
        firestoreSetError,
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
        // Coba dari Firestore screenshots collection
        const db = await initFirestore();
        if (db) {
          try {
            const snap = await db.collection("screenshots").doc(txId).get();
            if (snap.exists) {
              const data = snap.data()!;
              const mime = data.mimeType || "image/png";
              const img = Buffer.from(data.base64, "base64");
              res.setHeader("Content-Type", mime);
              res.setHeader("Content-Length", img.length.toString());
              res.status(200).end(img);
              return;
            }
          } catch {}
        }
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
      const hash = crypto.createHash("sha256").update(activationCode).digest("hex");
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


