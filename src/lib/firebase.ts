import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const getEnv = (key: string, fallback: string = ''): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || fallback;
  }
  return fallback;
};

/**
 * Custom Domain Authentication for Sevya (auth.sevya.com / sevya.com)
 * Replaces default *.firebaseapp.com to prevent exposure of Firebase developer info,
 * project IDs, support emails, or default public hosting pages.
 */
export const getSevyaAuthDomain = (): string => {
  const configured = getEnv('VITE_FIREBASE_AUTH_DOMAIN');
  if (configured) return configured;

  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host.includes('sevya.com')) {
      return host.startsWith('auth.') ? host : `auth.${host}`;
    }
  }
  return 'auth.sevya.com';
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY', 'AIzaSySevyaProductionKey2026'),
  authDomain: getSevyaAuthDomain(),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', 'sevya-tpms'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', 'sevya-tpms.firebasestorage.app'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '829102938102'),
  appId: getEnv('VITE_FIREBASE_APP_ID', '1:829102938102:web:sevya928371829'),
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
  authuser: '0',
});

// Add Google Workspace scopes for Gmail and Google Calendar

