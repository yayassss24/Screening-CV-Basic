import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standard handle for popups signing
export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

// Log out helper
export async function logOut() {
  return signOut(auth);
}

// Connection test validating connectivity to database servers
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Firebase client is currently offline. Please review configurations.");
    }
  }
}

// Lazy connection check is available on-demand, not at module load time
