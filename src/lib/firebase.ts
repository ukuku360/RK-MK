import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { FIREBASE_CONFIG } from '../constants';
import { isLocalDevelopmentMode } from './adminAccess';

export function isFirebaseConfigured(): boolean {
  if (isLocalDevelopmentMode()) {
    return false;
  }

  return Object.values(FIREBASE_CONFIG).every((value) => {
    if (!value || !value.trim()) {
      return false;
    }

    return !value.startsWith('YOUR_FIREBASE_');
  });
}

export function getFirebaseDatabase() {
  const app = getFirebaseApp();
  return getDatabase(app);
}

export function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}
