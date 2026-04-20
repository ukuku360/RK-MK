import { BUILDINGS, EVENT_PRESET } from '../../src/config/eventConfig';
import type { ParticipantRecord } from '../../src/types';
import {
  applyParticipantRegistration,
  getEventRegistrationStatus,
  normalizePlayerRecord,
  normalizeRegistrationInput,
} from '../../src/utils/registration';
import { getFirebaseAdminDatabase, isFirebaseAdminConfigured } from '../_lib/firebaseAdmin';

const MAX_EVENT_PLAYERS = 16;

function isEventIdAllowed(eventId: string) {
  return BUILDINGS.some((building) => building.eventId === eventId);
}

function participantMapToList(value: unknown) {
  if (!value || typeof value !== 'object') {
    return [] as ParticipantRecord[];
  }

  return Object.entries(value as Record<string, unknown>).map(([id, participant]) =>
    normalizePlayerRecord({
      id,
      ...(participant as Omit<ParticipantRecord, 'id'>),
    }),
  );
}

function participantListToMap(players: ParticipantRecord[]) {
  return Object.fromEntries(
    players.map((player) => {
      const { id, ...payload } = player;
      return [id as string, payload];
    }),
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  if (!isFirebaseAdminConfigured()) {
    res.status(500).json({ error: 'Registration API is not configured on the server.' });
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

  const db = getFirebaseAdminDatabase();
  const eventRef = db.ref(`events/${eventId}`);
  const participantId = db.ref(`events/${eventId}/participants`).push().key;
  const timestamp = Date.now();

  if (!participantId) {
    res.status(500).json({ error: 'Unable to allocate a registration slot.' });
    return;
  }

  let duplicateDetected = false;
  let lockedDetected = false;
  let committedOutcome: 'active' | 'waitlist' | null = null;
  let committedRegistrationStatus: ReturnType<typeof getEventRegistrationStatus> | null = null;

  try {
    const transactionResult = await eventRef.transaction((currentValue) => {
      const current =
        currentValue && typeof currentValue === 'object'
          ? (currentValue as Record<string, unknown>)
          : {};
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

      if (registration.outcome === 'duplicate' || registration.outcome === 'locked') {
        duplicateDetected = registration.outcome === 'duplicate';
        lockedDetected = registration.outcome === 'locked';
        return;
      }

      const registrationStatus = getEventRegistrationStatus(
        registration.players.length,
        MAX_EVENT_PLAYERS,
        isRosterFinalized,
      );
      committedOutcome = registration.outcome;
      committedRegistrationStatus = registrationStatus;

      return {
        ...current,
        title: typeof current.title === 'string' ? current.title : EVENT_PRESET.title,
        maxPlayers: MAX_EVENT_PLAYERS,
        participants: participantListToMap(registration.players),
        waitlist: participantListToMap(registration.waitingPlayers),
        registrationStatus,
        lockedAt:
          isRosterFinalized && typeof current.lockedAt === 'number' ? current.lockedAt : null,
        updatedAt: timestamp,
        lastUpdatedBy: 'public-registration',
      };
    });

    if (duplicateDetected) {
      res.status(409).json({ error: 'This driver is already registered.' });
      return;
    }

    if (lockedDetected) {
      res.status(409).json({ error: 'Registrations are locked for this building.' });
      return;
    }

    if (!transactionResult.committed || !committedOutcome || !committedRegistrationStatus) {
      res.status(500).json({ error: 'Registration could not be completed.' });
      return;
    }

    const message =
      committedOutcome === 'waitlist'
        ? 'Grid full. Driver added to Pit Lane.'
        : 'Driver added to the grid.';

    res.status(200).json({
      outcome: committedOutcome,
      registrationStatus: committedRegistrationStatus,
      message,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to register the driver right now.' });
  }
}
