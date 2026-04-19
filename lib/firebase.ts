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

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;
let auth: Auth;

export function initFirebase() {
  if (!firebaseConfig.projectId) {
    console.warn('[Firebase] EXPO_PUBLIC_FIREBASE_PROJECT_ID not set — Firebase disabled');
    return false;
  }
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db      = getFirestore(app);
  storage = getStorage(app);
  auth    = getAuth(app);
  return true;
}

export function getDb(): Firestore {
  if (!db) initFirebase();
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) initFirebase();
  return storage;
}

export function getFirebaseAuth(): Auth {
  if (!auth) initFirebase();
  return auth;
}

export function isFirebaseReady(): boolean {
  return !!firebaseConfig.projectId && !!firebaseConfig.apiKey;
}

export const SCHOOL_ID = 'ahbabullah';
