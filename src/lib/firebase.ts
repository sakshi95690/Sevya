import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';

const getEnv = (key: string, fallback: string = ''): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return String(import.meta.env[key]).trim();
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key] || fallback).trim();
  }
  return fallback;
};

/**
 * Resolves the Firebase Auth Domain.
 * Uses VITE_FIREBASE_AUTH_DOMAIN if provided, otherwise defaults to `<projectId>.firebaseapp.com`.
 */
export const getSevyaAuthDomain = (): string => {
  const configured = getEnv('VITE_FIREBASE_AUTH_DOMAIN');
  if (configured) return configured;

  const projectId = getEnv('VITE_FIREBASE_PROJECT_ID') || 'sevya-tms';
  return `${projectId}.firebaseapp.com`;
};

export const isFirebaseConfigured = (): boolean => {
  const apiKey = getEnv('VITE_FIREBASE_API_KEY');
  return Boolean(
    apiKey &&
    apiKey.length > 5 &&
    !apiKey.includes('placeholder') &&
    !apiKey.includes('YOUR_') &&
    apiKey !== 'undefined' &&
    apiKey !== 'null'
  );
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

export const getFirebaseApp = (): FirebaseApp | null => {
  if (_app) return _app;
  if (!isFirebaseConfigured()) return null;

  if (getApps().length > 0) {
    _app = getApp();
    return _app;
  }

  const projectId = getEnv('VITE_FIREBASE_PROJECT_ID', 'sevya-tms');
  const firebaseConfig = {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getSevyaAuthDomain(),
    projectId: projectId,
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', `${projectId}.firebasestorage.app`),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID'),
  };

  try {
    _app = initializeApp(firebaseConfig);
    return _app;
  } catch (err) {
    console.warn('[Firebase] Initialization notice:', err);
    return null;
  }
};

export const getFirebaseAuth = (): Auth | null => {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  if (!app) return null;

  try {
    _auth = getAuth(app);
    return _auth;
  } catch (err) {
    console.warn('[Firebase Auth] Initialization notice:', err);
    return null;
  }
};

// Safe lazy proxy for auth export so importing `auth` never throws an uncaught error at module evaluation time
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getFirebaseAuth();
    if (!instance) {
      if (prop === 'currentUser') return null;
      if (prop === 'name') return '[Firebase Auth (Uninitialized)]';
      return undefined;
    }
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  },
});

export const getGoogleAuthProvider = (): GoogleAuthProvider => {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.addScope('openid');
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return provider;
};

export const googleAuthProvider = getGoogleAuthProvider();
