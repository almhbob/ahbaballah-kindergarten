import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            ?? '',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? '',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         ?? '',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID              ?? '',
  measurementId:     process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID     ?? '',
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let auth: Auth | null = null;

export function initFirebase(): boolean {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
    console.warn('[Firebase] Missing config — Firebase disabled');
    return false;
  }
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    db      = getFirestore(app);
    storage = getStorage(app);
    auth    = getAuth(app);
    return true;
  } catch (err) {
    console.error('[Firebase] initFirebase failed:', err);
    return false;
  }
}

export function getDb(): Firestore {
  if (!db) {
    const ok = initFirebase();
    if (!ok || !db) throw new Error('[Firebase] Firestore not initialized — check env vars');
  }
  return db!;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    const ok = initFirebase();
    if (!ok || !storage) throw new Error('[Firebase] Storage not initialized');
  }
  return storage!;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const ok = initFirebase();
    if (!ok || !auth) throw new Error('[Firebase] Auth not initialized');
  }
  return auth!;
}

export function isFirebaseReady(): boolean {
  return !!firebaseConfig.projectId && !!firebaseConfig.apiKey;
}

export const SCHOOL_ID = 'ahbabullah';
