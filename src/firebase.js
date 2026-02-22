import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Auto sign-in anonymously — this gives us a uid for Firestore security rules
// without requiring the user to create an account or enter a password.
// Firebase Anonymous Auth is free and invisible to the user.
let authReady = false;
let authResolve;
export const authReadyPromise = new Promise((resolve) => {
  authResolve = resolve;
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    authReady = true;
    authResolve(user);
  } else {
    signInAnonymously(auth).catch((err) => {
      console.error('Anonymous auth failed:', err);
      authResolve(null);
    });
  }
});

export function isAuthReady() {
  return authReady;
}
