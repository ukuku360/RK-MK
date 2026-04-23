import { EVENT_PRESET } from '../../src/config/eventConfig.js';
import {
  applyEventPatch,
  eventDocumentToPersistedState,
  isEventIdAllowed,
  readEventDocument,
  writeEventDocument,
} from '../_lib/eventStore.js';
import { readBearerToken, verifyAdminSessionToken } from '../_lib/adminAuth.js';

function readEventId(req: any) {
  if (typeof req.query?.eventId === 'string') {
    return req.query.eventId.trim();
  }

  if (typeof req.body?.eventId === 'string') {
    return req.body.eventId.trim();
  }

  return '';
}

export default async function handler(req: any, res: any) {
  const eventId = readEventId(req);

  if (!eventId || !isEventIdAllowed(eventId)) {
    res.status(400).json({ error: 'Unknown event.' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const document = await readEventDocument(eventId, EVENT_PRESET.title);
      res.status(200).json({ state: eventDocumentToPersistedState(document) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to load event state.' });
    }
    return;
  }

  if (req.method === 'PATCH') {
    if (!verifyAdminSessionToken(readBearerToken(req))) {
      res.status(401).json({ error: 'Admin session is required.' });
      return;
    }

    const updates =
      req.body?.updates && typeof req.body.updates === 'object'
        ? (req.body.updates as Record<string, unknown>)
        : null;

    if (!updates) {
      res.status(400).json({ error: 'Updates are required.' });
      return;
    }

    try {
      const current = await readEventDocument(eventId, EVENT_PRESET.title);
      const nextDocument = await writeEventDocument(eventId, applyEventPatch(current, updates));
      res.status(200).json({ state: eventDocumentToPersistedState(nextDocument) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to update event state.' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed.' });
}
