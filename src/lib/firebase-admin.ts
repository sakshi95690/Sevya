import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App;

if (!getApps().length) {
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = cert(sa);
    } catch {
      // fallback
    }
  }

  if (!credential) {
    // Default dummy credential for local dev mode
    adminApp = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'sevya-app',
    });
  } else {
    adminApp = initializeApp({
      credential,
    });
  }
} else {
  adminApp = getApps()[0];
}

export const adminAuth: Auth = getAuth(adminApp);
