import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App;

if (!getApps().length) {
  let credential;
  const rawSa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawSa) {
    try {
      // Support both direct JSON string and Base64 encoded JSON
      const jsonStr = rawSa.startsWith('{') ? rawSa : Buffer.from(rawSa, 'base64').toString('utf-8');
      const sa = JSON.parse(jsonStr);
      credential = cert(sa);
    } catch (err) {
      console.warn('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err);
    }
  }

  const effectiveProjectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    'sevya-tms';

  if (!credential) {
    adminApp = initializeApp({
      projectId: effectiveProjectId,
    });
  } else {
    adminApp = initializeApp({
      credential,
      projectId: effectiveProjectId,
    });
  }
} else {
  adminApp = getApps()[0];
}

export const adminAuth: Auth = getAuth(adminApp);

