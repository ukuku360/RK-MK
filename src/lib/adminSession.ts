import { getIdTokenResult, signInWithCustomToken, signOut } from 'firebase/auth';
import { ADMIN_SESSION_ENDPOINT } from '../constants';
import {
  getDevelopmentAdminPassword,
  isLocalDevelopmentMode,
  setLocalDevelopmentAdminSession,
} from './adminAccess';
import { getFirebaseAuth, isFirebaseConfigured } from './firebase';

interface AdminSessionResponse {
  token?: string;
  error?: string;
}

async function readJson(response: Response): Promise<AdminSessionResponse> {
  try {
    return (await response.json()) as AdminSessionResponse;
  } catch {
    return {};
  }
}

export async function signInAdminWithPin(pin: string) {
  const normalizedPin = pin.trim();

  if (isLocalDevelopmentMode()) {
    if (!normalizedPin || normalizedPin !== getDevelopmentAdminPassword()) {
      setLocalDevelopmentAdminSession(false);
      throw new Error('Incorrect password.');
    }

    setLocalDevelopmentAdminSession(true);
    return null;
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

  const auth = getFirebaseAuth();
  const credential = await signInWithCustomToken(auth, payload.token);
  const tokenResult = await getIdTokenResult(credential.user, true);

  if (tokenResult.claims.admin !== true) {
    await signOut(auth);
    throw new Error('Admin access was not granted for this session.');
  }

  return credential.user;
}

export async function signOutAdmin() {
  setLocalDevelopmentAdminSession(false);

  if (!isFirebaseConfigured()) {
    return;
  }

  await signOut(getFirebaseAuth());
}
