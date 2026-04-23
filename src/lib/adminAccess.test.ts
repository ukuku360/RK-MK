import { describe, expect, it } from 'vitest';
import {
  getDevelopmentAdminPassword,
  hasLocalDevelopmentAdminSession,
  isLocalDevelopmentMode,
  setLocalDevelopmentAdminSession,
} from './adminAccess';

function createStorageMock() {
  const state = new Map<string, string>();

  return {
    getItem(key: string) {
      return state.has(key) ? state.get(key) ?? null : null;
    },
    setItem(key: string, value: string) {
      state.set(key, value);
    },
    removeItem(key: string) {
      state.delete(key);
    },
  };
}

describe('admin access helpers', () => {
  it('uses local development mode by default while running vite dev', () => {
    expect(
      isLocalDevelopmentMode({
        DEV: true,
      }),
    ).toBe(true);
  });

  it('allows opting back into the remote backend during development', () => {
    expect(
      isLocalDevelopmentMode({
        DEV: true,
        VITE_USE_REMOTE_BACKEND_IN_DEV: 'true',
      }),
    ).toBe(false);
  });

  it('defaults the development admin password to 8888', () => {
    expect(
      getDevelopmentAdminPassword({
        DEV: true,
      }),
    ).toBe('8888');

    expect(
      getDevelopmentAdminPassword({
        DEV: true,
        VITE_DEV_ADMIN_PIN: '  kart-admin  ',
      }),
    ).toBe('kart-admin');
  });

  it('persists the local development admin session in storage', () => {
    const storage = createStorageMock();
    const env = {
      DEV: true,
    };

    expect(hasLocalDevelopmentAdminSession({ env, storage })).toBe(false);

    setLocalDevelopmentAdminSession(true, { env, storage });
    expect(hasLocalDevelopmentAdminSession({ env, storage })).toBe(true);

    setLocalDevelopmentAdminSession(false, { env, storage });
    expect(hasLocalDevelopmentAdminSession({ env, storage })).toBe(false);
  });
});
