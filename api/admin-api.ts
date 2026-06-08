import { readFileSync, existsSync } from "fs";
import { join } from "path";
import crypto from "crypto";

const DB_PATH = join(process.cwd(), "db.json");

function readDb(): any {
  if (!existsSync(DB_PATH)) return { users: {}, activation_codes: [], analyses: [], transactions: [] };
  return JSON.parse(readFileSync(DB_PATH, "utf-8"));
}

let firestoreDb: any = null;
let fsInitDone = false;
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

let diagLog: string[] = [];
function diag(msg: string) { diagLog.push(msg); console.log("[ADMIN-API]", msg); }

async function readAllTransactions(): Promise<any[]> {
  diagLog = [];
  const db = await initFirestore();
  if (db) {
    diag("Firestore initialized, reading transactions...");
    try {
      const snap = await db.collection("transactions").get();
      const txns: any[] = [];
      snap.forEach((doc: any) => txns.push({ id: doc.id, ...doc.data() }));
      diag(`Firestore returned ${txns.length} transactions`);
      return txns;
    } catch (e: any) {
      diag(`Firestore read error: ${e.message}`);
    }
  } else {
    diag("Firestore not available, falling back to db.json");
  }
  const dbData = readDb();
  const count = (dbData.transactions || []).length;
  diag(`db.json fallback: ${count} transactions`);
  return dbData.transactions || [];
}

async function readTransaction(id: string): Promise<any | null> {
  const all = await readAllTransactions();
  return all.find((t: any) => t.id === id) || null;
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

      let savedTo = "none";
      const db = await initFirestore();
      if (db) {
        diag("Attempting to save transaction to Firestore...");
        try {
          await db.collection("transactions").doc(tx.id).set(tx);
          diag("Transaction saved to Firestore OK");
          if (screenshotBase64) {
            try {
              await db.collection("screenshots").doc(tx.id).set({
                screenshotBase64,
                screenshotMimeType: screenshotMimeType || "image/png",
              });
              diag("Screenshot saved to Firestore OK");
            } catch (ssErr: any) {
              diag(`Screenshot Firestore error: ${ssErr.message}`);
            }
          }
          savedTo = "firestore";
        } catch (fsErr: any) {
          diag(`Firestore write error: ${fsErr.message}`);
          diag("Falling back to db.json...");
        }
      }
      if (savedTo !== "firestore") {
        diag("Attempting db.json fallback save...");
        try {
          const dbData = readDb();
          dbData.transactions.push({ ...tx, screenshotBase64, screenshotMimeType });
          const { writeFileSync } = await import("fs");
          writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));
          savedTo = "db.json";
          diag("Saved to db.json OK");
        } catch (jsonErr: any) {
          diag(`db.json write error: ${jsonErr.message}`);
        }
      }

      res.setHeader("Content-Type", "application/json");
      res.status(200).end(JSON.stringify({ success: true, transactionId, paket, nominal, status }));
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
      const envKeys = Object.keys(process.env).filter(k => !k.toLowerCase().includes("key") && !k.toLowerCase().includes("secret") && !k.toLowerCase().includes("token") && !k.toLowerCase().includes("password"));
      res.setHeader("Content-Type", "application/json");
      res.status(200).end(JSON.stringify({
        firebaseConfigured: saExists,
        firebaseServiceAccountLength: saLen,
        firestoreDbReady: !!db,
        fsInitDone,
        dbJsonPath: DB_PATH,
        dbJsonExists,
        diag: diagLog,
        envKeys,
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

      // Update Firestore
      const db = await initFirestore();
      if (db) {
        try {
          await db.collection("transactions").doc(tx.id).update({
            status: "PAID",
            verified_at: tx.verified_at,
            codePlainForDb: activationCode,
          });
          const codeData = {
            hash,
            kodePlainForDbFileOnly: activationCode,
            paket: tx.paket,
            digunakan: false,
            emailPenerima: tx.email,
            tanggalCadaluwarsa: expireSub.toISOString().split("T")[0],
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
          };
          await db.collection("activation_codes").add(codeData);
        } catch {}
      }

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

      // Update Firestore
      const db = await initFirestore();
      if (db) {
        try {
          await db.collection("transactions").doc(tx.id).update({
            status: "FAILED",
            verified_at: new Date().toISOString(),
          });
        } catch {}
      }

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


