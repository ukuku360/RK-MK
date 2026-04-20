interface AdminAccessEnv {
  DEV: boolean;
  VITE_DEV_ADMIN_PIN?: string;
  VITE_USE_REMOTE_BACKEND_IN_DEV?: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface AdminAccessOptions {
  env?: AdminAccessEnv;
  storage?: StorageLike | null;
}

const LOCAL_DEV_ADMIN_SESSION_KEY = 'rk_local_dev_admin_session';
const LOCAL_DEV_ADMIN_EVENT = 'rk-local-dev-admin-session-change';
export const LOCAL_DEV_ADMIN_UID = 'local-dev-admin';

function readBooleanEnv(value: string | undefined) {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function emitLocalAdminSessionChange() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(LOCAL_DEV_ADMIN_EVENT));
}

export function isLocalDevelopmentMode(env: AdminAccessEnv = import.meta.env) {
  return env.DEV && !readBooleanEnv(env.VITE_USE_REMOTE_BACKEND_IN_DEV);
}

export function getDevelopmentAdminPassword(env: AdminAccessEnv = import.meta.env) {
  return env.VITE_DEV_ADMIN_PIN?.trim() || 'admin';
}

export function hasLocalDevelopmentAdminSession(options: AdminAccessOptions = {}) {
  const { env = import.meta.env, storage = getStorage() } = options;

  if (!isLocalDevelopmentMode(env) || !storage) {
    return false;
  }

  return storage.getItem(LOCAL_DEV_ADMIN_SESSION_KEY) === 'true';
}

export function setLocalDevelopmentAdminSession(
  isActive: boolean,
  options: AdminAccessOptions = {},
) {
  const { env = import.meta.env, storage = getStorage() } = options;

  if (!isLocalDevelopmentMode(env) || !storage) {
    return;
  }

  if (isActive) {
    storage.setItem(LOCAL_DEV_ADMIN_SESSION_KEY, 'true');
  } else {
    storage.removeItem(LOCAL_DEV_ADMIN_SESSION_KEY);
  }

  emitLocalAdminSessionChange();
}

export function subscribeToLocalDevelopmentAdminSession(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener('storage', listener);
  window.addEventListener(LOCAL_DEV_ADMIN_EVENT, listener);

  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(LOCAL_DEV_ADMIN_EVENT, listener);
  };
}
