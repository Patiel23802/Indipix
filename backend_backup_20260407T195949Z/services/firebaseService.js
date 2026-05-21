const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

let firebaseInitialized = false;
let firebaseInitError = null;

function parseServiceAccountFromEnv() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    return JSON.parse(decoded);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const raw = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH.trim(), 'utf8');
    return JSON.parse(raw);
  }

  const projectRoot = path.resolve(__dirname, '..');
  const defaultCredentialPaths = [
    path.join(projectRoot, 'chitrakalaweb1-firebase-adminsdk-fbsvc-6392a5a3cb.json'),
    path.join(projectRoot, 'firebase-service-account.json'),
  ];

  for (const candidatePath of defaultCredentialPaths) {
    if (fs.existsSync(candidatePath)) {
      const raw = fs.readFileSync(candidatePath, 'utf8');
      return JSON.parse(raw);
    }
  }

  return null;
}

function initializeFirebase() {
  if (firebaseInitialized || admin.apps.length > 0) {
    firebaseInitialized = true;
    return true;
  }

  try {
    const serviceAccount = parseServiceAccountFromEnv();

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Falls back to GOOGLE_APPLICATION_CREDENTIALS if available.
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } else {
      throw new Error(
        'No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_BASE64, or GOOGLE_APPLICATION_CREDENTIALS.'
      );
    }

    firebaseInitialized = true;
    firebaseInitError = null;
    return true;
  } catch (error) {
    firebaseInitError = error;
    firebaseInitialized = false;
    return false;
  }
}

function isFirebaseReady() {
  if (firebaseInitialized) return true;
  return initializeFirebase();
}

async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Firebase ID token is required');
  }

  if (!isFirebaseReady()) {
    throw new Error(
      `Firebase Admin is not configured: ${firebaseInitError ? firebaseInitError.message : 'initialization failed'}`
    );
  }

  return admin.auth().verifyIdToken(idToken, true);
}

function getFirebaseMessaging() {
  if (!isFirebaseReady()) return null;
  return admin.messaging();
}

module.exports = {
  initializeFirebase,
  isFirebaseReady,
  verifyFirebaseIdToken,
  getFirebaseMessaging,
};
