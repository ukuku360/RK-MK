import type { EventRegistrationStatus, ParticipantRecord } from '../types';

export interface RegistrationInput {
  name: string;
  nickname: string;
  teamTag: string;
}

interface ApplyParticipantRegistrationInput {
  players: ParticipantRecord[];
  waitingPlayers: ParticipantRecord[];
  input: RegistrationInput;
  maxPlayers: number;
  isRosterFinalized: boolean;
  createId: () => string;
  timestamp: unknown;
  updatedBy?: string | null;
}

export interface ApplyParticipantRegistrationResult {
  outcome: 'active' | 'waitlist' | 'duplicate' | 'locked';
  players: ParticipantRecord[];
  waitingPlayers: ParticipantRecord[];
  participant?: ParticipantRecord;
}

function normalizeTextValue(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeSignatureFragment(value: string) {
  return normalizeTextValue(value).toLowerCase();
}

export function normalizeRegistrationInput(input: RegistrationInput): RegistrationInput {
  return {
    name: normalizeTextValue(input.name),
    nickname: normalizeTextValue(input.nickname),
    teamTag: normalizeTextValue(input.teamTag),
  };
}

export function buildParticipantSignature(input: RegistrationInput | ParticipantRecord) {
  const normalized = normalizeRegistrationInput(input);
  return [
    normalizeSignatureFragment(normalized.name),
    normalizeSignatureFragment(normalized.nickname),
    normalizeSignatureFragment(normalized.teamTag),
  ].join('::');
}

export function normalizePlayerRecord(
  player: Partial<ParticipantRecord> | null | undefined,
): ParticipantRecord {
  const normalized: ParticipantRecord = {
    name: typeof player?.name === 'string' ? player.name : '',
    nickname: typeof player?.nickname === 'string' ? player.nickname : '',
    teamTag: typeof player?.teamTag === 'string' ? player.teamTag : '',
  };

  if (typeof player?.id === 'string' && player.id) {
    normalized.id = player.id;
  }

  if (player?.createdAt !== undefined) {
    normalized.createdAt = player.createdAt;
  }

  if (player?.updatedAt !== undefined) {
    normalized.updatedAt = player.updatedAt;
  }

  if (typeof player?.lastUpdatedBy === 'string') {
    normalized.lastUpdatedBy = player.lastUpdatedBy;
  }

  if (player?.checkedIn) {
    normalized.checkedIn = true;
  }

  if (player?.empty) {
    normalized.empty = true;
  }

  if (player?.isBye) {
    normalized.isBye = true;
  }

  return normalized;
}

export function sortParticipantsByCreatedAt(players: ParticipantRecord[]) {
  return [...players].sort((left, right) => {
    const leftCreatedAt =
      typeof left.createdAt === 'number' && Number.isFinite(left.createdAt) ? left.createdAt : 0;
    const rightCreatedAt =
      typeof right.createdAt === 'number' && Number.isFinite(right.createdAt) ? right.createdAt : 0;

    if (leftCreatedAt !== rightCreatedAt) {
      return leftCreatedAt - rightCreatedAt;
    }

    return (left.id || left.name).localeCompare(right.id || right.name);
  });
}

export function getEventRegistrationStatus(
  playersCount: number,
  maxPlayers: number,
  isRosterFinalized: boolean,
): EventRegistrationStatus {
  if (isRosterFinalized) {
    return 'locked';
  }

  if (playersCount >= maxPlayers) {
    return 'full';
  }

  if (playersCount >= Math.max(1, maxPlayers - 2)) {
    return 'nearly-full';
  }

  return 'open';
}

export function applyParticipantRegistration({
  players,
  waitingPlayers,
  input,
  maxPlayers,
  isRosterFinalized,
  createId,
  timestamp,
  updatedBy = null,
}: ApplyParticipantRegistrationInput): ApplyParticipantRegistrationResult {
  const normalizedInput = normalizeRegistrationInput(input);

  if (!normalizedInput.name) {
    return {
      outcome: 'duplicate',
      players,
      waitingPlayers,
    };
  }

  if (isRosterFinalized) {
    return {
      outcome: 'locked',
      players,
      waitingPlayers,
    };
  }

  const signature = buildParticipantSignature(normalizedInput);
  const existingEntries = [...players, ...waitingPlayers];

  if (existingEntries.some((player) => buildParticipantSignature(player) === signature)) {
    return {
      outcome: 'duplicate',
      players,
      waitingPlayers,
    };
  }

  const participant: ParticipantRecord = {
    id: createId(),
    ...normalizedInput,
    checkedIn: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastUpdatedBy: updatedBy,
  };

  if (players.length >= maxPlayers) {
    return {
      outcome: 'waitlist',
      players,
      waitingPlayers: sortParticipantsByCreatedAt([...waitingPlayers, participant]),
      participant,
    };
  }

  return {
    outcome: 'active',
    players: sortParticipantsByCreatedAt([...players, participant]),
    waitingPlayers,
    participant,
  };
}
