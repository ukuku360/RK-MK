import {
  get,
  serverTimestamp,
  set,
  update,
  type DatabaseReference,
} from 'firebase/database';
import { MAX_PLAYERS } from '../../constants';
import {
  getEventRegistrationStatus,
} from '../../utils/registration';
import {
  getSnapshotChildCount,
  isSeededTestPlayer,
  snapshotToPlayerRecords,
} from './state';

export async function ensureEventDocument(eventRef: DatabaseReference, title: string) {
  const snapshot = await get(eventRef);

  if (snapshot.exists()) {
    return;
  }

  await set(eventRef, {
    title,
    maxPlayers: MAX_PLAYERS,
    isRosterFinalized: false,
    rosterOrder: [],
    registrationStatus: getEventRegistrationStatus(0, MAX_PLAYERS, false),
    lockedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function purgeSeededTestDataRemotelyIfNeeded(
  eventRef: DatabaseReference,
  participantsRef: DatabaseReference,
  waitlistRef: DatabaseReference,
) {
  const [participantsSnapshot, waitlistSnapshot] = await Promise.all([
    get(participantsRef),
    get(waitlistRef),
  ]);

  const participantRecords = snapshotToPlayerRecords(participantsSnapshot);
  const waitlistRecords = snapshotToPlayerRecords(waitlistSnapshot);
  const hasLegacyData =
    getSnapshotChildCount(participantsSnapshot) > 0 || getSnapshotChildCount(waitlistSnapshot) > 0;

  if (!hasLegacyData) {
    return;
  }

  const participantsAreSeededOnly = participantRecords.every((player) => isSeededTestPlayer(player));
  const waitlistAreSeededOnly = waitlistRecords.every((player) => isSeededTestPlayer(player));

  if (!participantsAreSeededOnly || !waitlistAreSeededOnly) {
    return;
  }

  await update(eventRef, {
    participants: null,
    waitlist: null,
    rosterOrder: null,
    isRosterFinalized: false,
    registrationStatus: getEventRegistrationStatus(0, MAX_PLAYERS, false),
    lockedAt: null,
    stageResults: null,
    raceHistory: null,
    matchWinners: null,
    matchScores: null,
    matchHistory: null,
    updatedAt: serverTimestamp(),
  });
}
