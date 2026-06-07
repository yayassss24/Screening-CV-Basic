import { readFileSync } from "fs";
import { resolve } from "path";

async function migrate() {
  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saRaw) {
    console.error("ERROR: env FIREBASE_SERVICE_ACCOUNT belum di-set.");
    console.error("Cara: FIREBASE_SERVICE_ACCOUNT='$(cat service-account.json)' npx tsx scripts/migrate-to-firestore.ts");
    process.exit(1);
  }

  const serviceAccount = JSON.parse(saRaw);
  const dbPath = resolve(process.cwd(), "db.json");
  const data = JSON.parse(readFileSync(dbPath, "utf-8"));

  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }
  const firestore = getFirestore();

  const batch = firestore.batch();

  // Users collection (doc id = email)
  for (const [email, profile] of Object.entries(data.users || {})) {
    const ref = firestore.collection("users").doc(email);
    batch.set(ref, profile);
    console.log(`  [users] ${email} -> ${(profile as any).paket}`);
  }

  // Activation codes collection (doc id = hash)
  for (const code of data.activation_codes || []) {
    const docId = code.hash;
    const ref = firestore.collection("activation_codes").doc(docId);
    batch.set(ref, code);
    console.log(`  [activation_codes] ${code.kodePlainForDbFileOnly}`);
  }

  // Analyses collection (doc id = analysis.id)
  for (const analysis of data.analyses || []) {
    const ref = firestore.collection("analyses").doc(analysis.id);
    batch.set(ref, analysis);
    console.log(`  [analyses] ${analysis.id}`);
  }

  // Transactions collection (doc id = tx.id)
  for (const tx of data.transactions || []) {
    const ref = firestore.collection("transactions").doc(tx.id);
    batch.set(ref, tx);
    console.log(`  [transactions] ${tx.id} (${tx.paket})`);
  }

  await batch.commit();
  console.log("\nSUKSES! Semua data dari db.json telah diimpor ke Firestore.");
}

migrate().catch((e) => {
  console.error("Migrasi gagal:", e.message);
  process.exit(1);
});
