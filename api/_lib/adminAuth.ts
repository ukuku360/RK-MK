import { createHmac, timingSafeEqual } from 'node:crypto';

const ADMIN_UID = 'rk-events-admin';
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function readTrimmedEnv(name: string) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getSigningSecret() {
  return readTrimmedEnv('ADMIN_SESSION_SECRET') || getAdminPin();
}

function signPayload(payload: string) {
  return createHmac('sha256', getSigningSecret()).update(payload).digest('base64url');
}

export function getAdminPin() {
  const configuredPin = readTrimmedEnv('EVENT_ADMIN_PIN');

  if (configuredPin) {
    return configuredPin;
  }

  if (readTrimmedEnv('NODE_ENV') === 'production') {
    return '';
  }

  return '8888';
}

export function createAdminSessionToken() {
  const now = Date.now();
  const payload = base64UrlEncode(
    JSON.stringify({
      uid: ADMIN_UID,
      admin: true,
      iat: now,
      exp: now + ADMIN_SESSION_TTL_MS,
    }),
  );
  const signature = signPayload(payload);

  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token || !getSigningSecret()) {
    return false;
  }

  const [payload, signature] = token.split('.');

  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as {
      admin?: unknown;
      exp?: unknown;
    };

    return parsed.admin === true && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function readBearerToken(req: { headers?: Record<string, string | string[] | undefined> }) {
  const header = req.headers?.authorization;
  const value = Array.isArray(header) ? header[0] : header;

  if (!value?.startsWith('Bearer ')) {
    return '';
  }

  return value.slice('Bearer '.length).trim();
}
