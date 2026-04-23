import { EVENT_PRESET } from '../../src/config/eventConfig.js';
import {
  applyParticipantRegistration,
  getEventRegistrationStatus,
  normalizeRegistrationInput,
} from '../../src/utils/registration.js';
import {
  eventDocumentToPersistedState,
  isEventIdAllowed,
  participantListToMap,
  participantMapToList,
  readEventDocument,
  writeEventDocument,
} from '../_lib/eventStore.js';

const MAX_EVENT_PLAYERS = 16;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const eventId = typeof req.body?.eventId === 'string' ? req.body.eventId.trim() : '';
  const input = normalizeRegistrationInput({
    name: typeof req.body?.name === 'string' ? req.body.name : '',
    nickname: typeof req.body?.nickname === 'string' ? req.body.nickname : '',
    teamTag: typeof req.body?.teamTag === 'string' ? req.body.teamTag : '',
  });

  if (!eventId || !isEventIdAllowed(eventId)) {
    res.status(400).json({ error: 'Unknown event.' });
    return;
  }

  if (!input.name) {
    res.status(400).json({ error: 'Driver name is required.' });
    return;
  }

  if (input.name.length > 60 || input.nickname.length > 40 || input.teamTag.length > 40) {
    res.status(400).json({ error: 'One or more fields are too long.' });
    return;
  }

  const participantId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const timestamp = Date.now();

  try {
    const current = await readEventDocument(eventId, EVENT_PRESET.title);
    const isRosterFinalized = Boolean(current.isRosterFinalized);
    const players = participantMapToList(current.participants);
    const waitingPlayers = participantMapToList(current.waitlist);
    const registration = applyParticipantRegistration({
      players,
      waitingPlayers,
      input,
      maxPlayers: MAX_EVENT_PLAYERS,
      isRosterFinalized,
      createId: () => participantId,
      timestamp,
      updatedBy: 'public-registration',
    });

    if (registration.outcome === 'duplicate') {
      res.status(409).json({ error: 'This driver is already registered.' });
      return;
    }

    if (registration.outcome === 'locked') {
      res.status(409).json({ error: 'Registrations are locked for this building.' });
      return;
    }

    const registrationStatus = getEventRegistrationStatus(
      registration.players.length,
      MAX_EVENT_PLAYERS,
      isRosterFinalized,
    );
    const nextDocument = await writeEventDocument(eventId, {
      ...current,
      title: current.title || EVENT_PRESET.title,
      maxPlayers: MAX_EVENT_PLAYERS,
      participants: participantListToMap(registration.players),
      waitlist: participantListToMap(registration.waitingPlayers),
      registrationStatus,
      lockedAt: isRosterFinalized && typeof current.lockedAt === 'number' ? current.lockedAt : null,
      updatedAt: timestamp,
      lastUpdatedBy: 'public-registration',
    });

    const message =
      registration.outcome === 'waitlist'
        ? 'Grid full. Driver added to Pit Lane.'
        : 'Driver added to the grid.';

    res.status(200).json({
      outcome: registration.outcome,
      registrationStatus,
      message,
      state: eventDocumentToPersistedState(nextDocument),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to register the driver right now.' });
  }
}
