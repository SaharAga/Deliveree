import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider, 
  FacebookAuthProvider, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase Client Configuration
 * Standard authDomain matching Google OAuth Redirect URI
 */
const defaultAuthDomain =
  typeof window !== 'undefined' && window.location.hostname && (window.location.hostname.endsWith('web.app') || window.location.hostname.endsWith('firebaseapp.com'))
    ? window.location.hostname
    : (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'deliveree-app-2a938.firebaseapp.com');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDxg_M7gp0eIGASw9yr6-zvFzSBwI_0EyA',
  authDomain: defaultAuthDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'deliveree-app-2a938',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'deliveree-app-2a938.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '350721106692',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:350721106692:web:c0b6c70461f3e1868e6651',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.authDomain
);

// Initialize Firebase only once
export const app = isFirebaseConfigured
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

// Guarantee persistent login state across browser restarts and page refreshes
if (auth && isFirebaseConfigured) {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('[Firebase] setPersistence error:', err);
  });
}

// OAuth Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

export const facebookProvider = new FacebookAuthProvider();
