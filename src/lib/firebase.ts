import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

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

const projectId = getEnv('VITE_FIREBASE_PROJECT_ID', 'sevya-tms');

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getSevyaAuthDomain(),
  projectId: projectId,
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', `${projectId}.firebasestorage.app`),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID'),
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('email');
googleAuthProvider.addScope('profile');
googleAuthProvider.addScope('openid');
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});


