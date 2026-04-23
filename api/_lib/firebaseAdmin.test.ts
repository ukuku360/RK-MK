import { afterEach, describe, expect, it } from 'vitest';
import { getAdminPin } from './firebaseAdmin';

const originalEventAdminPin = process.env.EVENT_ADMIN_PIN;
const originalNodeEnv = process.env.NODE_ENV;

function restoreEnv(name: 'EVENT_ADMIN_PIN' | 'NODE_ENV', value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

afterEach(() => {
  restoreEnv('EVENT_ADMIN_PIN', originalEventAdminPin);
  restoreEnv('NODE_ENV', originalNodeEnv);
});

describe('getAdminPin', () => {
  it('returns the configured admin pin when it exists', () => {
    process.env.EVENT_ADMIN_PIN = 'super-secret';
    process.env.NODE_ENV = 'development';

    expect(getAdminPin()).toBe('super-secret');
  });

  it('falls back to 8888 outside production when no pin is configured', () => {
    delete process.env.EVENT_ADMIN_PIN;
    process.env.NODE_ENV = 'development';

    expect(getAdminPin()).toBe('8888');
  });

  it('requires an explicit pin in production', () => {
    delete process.env.EVENT_ADMIN_PIN;
    process.env.NODE_ENV = 'production';

    expect(getAdminPin()).toBe('');
  });
});
