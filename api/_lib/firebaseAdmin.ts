import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

function readTrimmedEnv(name: string) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function getServiceAccountConfig() {
  const rawJson = readTrimmedEnv('FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON');

  if (rawJson) {
    return JSON.parse(rawJson) as {
      projectId: string;
      clientEmail: string;
      privateKey: string;
    };
  }

  const projectId = readTrimmedEnv('FIREBASE_ADMIN_PROJECT_ID');
  const clientEmail = readTrimmedEnv('FIREBASE_ADMIN_CLIENT_EMAIL');
  const privateKey = readTrimmedEnv('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

export function getAdminPin() {
  const configuredPin = readTrimmedEnv('EVENT_ADMIN_PIN');

  if (configuredPin) {
    return configuredPin;
  }

  if (readTrimmedEnv('NODE_ENV') === 'production') {
    return '';
  }

  // Keep local development usable even when the server env is not wired yet.
  return 'admin';
}

export function isFirebaseAdminConfigured() {
  return Boolean(readTrimmedEnv('FIREBASE_ADMIN_DATABASE_URL'));
}

function getFirebaseAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  const serviceAccount = getServiceAccountConfig();
  const databaseURL = readTrimmedEnv('FIREBASE_ADMIN_DATABASE_URL');

  if (!databaseURL) {
    throw new Error('FIREBASE_ADMIN_DATABASE_URL is not configured.');
  }

  return initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
    databaseURL,
  });
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminDatabase() {
  return getDatabase(getFirebaseAdminApp());
}
