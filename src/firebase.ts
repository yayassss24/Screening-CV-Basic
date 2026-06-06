import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
export const auth = getAuth(app);

const APP_DOMAIN = "jagocv.app";

function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@${APP_DOMAIN}`;
}

export function emailToUsername(email: string): string {
  return email.replace(`@${APP_DOMAIN}`, "");
}

export async function registerWithUsername(username: string, password: string) {
  const email = usernameToEmail(username);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: username });
  return cred;
}

export async function loginWithUsername(username: string, password: string) {
  const email = usernameToEmail(username);
  return signInWithEmailAndPassword(auth, email, password);
}

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
