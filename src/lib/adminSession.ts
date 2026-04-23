import { ADMIN_SESSION_ENDPOINT } from '../constants';
import {
  getDevelopmentAdminPassword,
  isLocalDevelopmentMode,
  setLocalDevelopmentAdminSession,
} from './adminAccess';

const ADMIN_SESSION_TOKEN_KEY = 'rk_admin_session_token';
const ADMIN_SESSION_EVENT = 'rk-admin-session-change';
const ADMIN_UID = 'rk-events-admin';

interface AdminSessionResponse {
  token?: string;
  error?: string;
}

interface AdminTokenPayload {
  uid?: string;
  admin?: boolean;
  exp?: number;
}

async function readJson(response: Response): Promise<AdminSessionResponse> {
  try {
    return (await response.json()) as AdminSessionResponse;
  } catch {
    return {};
  }
}

function emitAdminSessionChange() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
}

function decodePayload(token: string): AdminTokenPayload | null {
  const [payload] = token.split('.');

  if (!payload) {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(paddedBase64)) as AdminTokenPayload;
  } catch {
    return null;
  }
}

export function getStoredAdminSessionToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = window.localStorage.getItem(ADMIN_SESSION_TOKEN_KEY);

  if (!token) {
    return null;
  }

  const payload = decodePayload(token);

  if (!payload?.admin || typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
    window.localStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
    return null;
  }

  return token;
}

export function getStoredAdminSessionPayload() {
  const token = getStoredAdminSessionToken();

  return token ? decodePayload(token) : null;
}

export function subscribeToAdminSession(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener('storage', listener);
  window.addEventListener(ADMIN_SESSION_EVENT, listener);

  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(ADMIN_SESSION_EVENT, listener);
  };
}

export async function signInAdminWithPin(pin: string) {
  const normalizedPin = pin.trim();

  if (isLocalDevelopmentMode()) {
    if (!normalizedPin || normalizedPin !== getDevelopmentAdminPassword()) {
      setLocalDevelopmentAdminSession(false);
      throw new Error('Incorrect password.');
    }

    setLocalDevelopmentAdminSession(true);
    return { uid: 'local-dev-admin' };
  }

  const response = await fetch(ADMIN_SESSION_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pin: normalizedPin }),
  });
  const payload = await readJson(response);

  if (!response.ok || !payload.token) {
    throw new Error(payload.error || 'Unable to verify the admin password.');
  }

  window.localStorage.setItem(ADMIN_SESSION_TOKEN_KEY, payload.token);
  emitAdminSessionChange();

  return { uid: ADMIN_UID };
}

export async function signOutAdmin() {
  setLocalDevelopmentAdminSession(false);

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
    emitAdminSessionChange();
  }
}
