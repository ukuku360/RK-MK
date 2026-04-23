import { timingSafeEqual } from 'node:crypto';
import { getAdminPin, getFirebaseAdminAuth, isFirebaseAdminConfigured } from '../_lib/firebaseAdmin';

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  if (!isFirebaseAdminConfigured()) {
    res.status(500).json({ error: 'Admin authentication is not configured on the server.' });
    return;
  }

  const expectedPin = getAdminPin();

  if (!expectedPin) {
    res.status(500).json({ error: 'EVENT_ADMIN_PIN is not configured on the server.' });
    return;
  }

  const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';

  if (!pin) {
    res.status(400).json({ error: 'PIN is required.' });
    return;
  }

  if (!safeCompare(pin, expectedPin)) {
    res.status(401).json({ error: 'Incorrect PIN.' });
    return;
  }

  try {
    const token = await getFirebaseAdminAuth().createCustomToken('rk-events-admin', {
      admin: true,
      role: 'race-control',
    });

    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to create an admin session.' });
  }
}
