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

async function readAllTransactions(): Promise<any[]> {
  const db = await initFirestore();
  if (db) {
    try {
      const snap = await db.collection("transactions").get();
      const txns: any[] = [];
      snap.forEach((doc: any) => txns.push({ id: doc.id, ...doc.data() }));
      return txns;
    } catch {}
  }
  const dbData = readDb();
  return dbData.transactions || [];
}

async function readTransaction(id: string): Promise<any | null> {
  const all = await readAllTransactions();
  return all.find((t: any) => t.id === id) || null;
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


