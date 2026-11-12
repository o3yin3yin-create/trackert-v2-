import admin from 'firebase-admin';

export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
    if (!projectId || !clientEmail || !privateKey) {
      console.warn('[firebaseAdmin] Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY');
      return null;
    }
    try {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } catch (e) {
      console.error('[firebaseAdmin] Init failed:', e);
      return null;
    }
  }
  return admin;
}

export function getAdminAuth() {
  const adm = getFirebaseAdmin();
  return adm ? adm.auth() : null;
}
