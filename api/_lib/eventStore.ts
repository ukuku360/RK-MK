import { get, put } from '@vercel/blob';
import { BUILDINGS, EVENT_PRESET } from '../../src/config/eventConfig.js';
import type {
  EventRegistrationStatus,
  PersistedEventState,
  PlayerRecord,
  RaceHistory,
  RaceHistoryEntry,
  RosterEntry,
  StageKey,
  StageRaceResult,
  StageResults,
  StageTieBreakBand,
} from '../../src/types';
import {
  getEventRegistrationStatus,
  normalizePlayerRecord,
  sortParticipantsByCreatedAt,
} from '../../src/utils/registration.js';

export interface StoredEventDocument {
  title: string;
  maxPlayers: number;
  participants: Record<string, Omit<PlayerRecord, 'id'>>;
  waitlist: Record<string, Omit<PlayerRecord, 'id'>>;
  rosterOrder: RosterEntry[];
  isRosterFinalized: boolean;
  registrationStatus: EventRegistrationStatus;
  lockedAt: number | null;
  stageResults: StageResults;
  raceHistory: RaceHistory;
  createdAt?: number;
  updatedAt?: number;
  lastUpdatedBy?: string | null;
}

type EventPatch = Record<string, unknown>;

const EVENT_PATH_PREFIX = 'events';
const MAX_PLAYERS = 16;
const MAX_RACE_HISTORY = 24;
const ALL_STAGE_KEYS: StageKey[] = ['group-a', 'group-b', 'group-c', 'group-d', 'final'];

function createEmptyStageResults(): StageResults {
  return {
    'group-a': [],
    'group-b': [],
    'group-c': [],
    'group-d': [],
    final: [],
  };
}

function cloneStageResults(stageResults: StageResults): StageResults {
  return ALL_STAGE_KEYS.reduce<StageResults>((nextResults, stageKey) => {
    nextResults[stageKey] = [...(stageResults[stageKey] ?? [])];
    return nextResults;
  }, createEmptyStageResults());
}

function normalizeRosterEntry(entry: RosterEntry | null | undefined): RosterEntry {
  if (!entry || typeof entry === 'string') {
    return entry ?? null;
  }

  return normalizePlayerRecord(entry);
}

function isValidStageKey(stageKey: unknown): stageKey is StageKey {
  return typeof stageKey === 'string' && ALL_STAGE_KEYS.includes(stageKey as StageKey);
}

function normalizeTieBreakBand(input: unknown): StageTieBreakBand | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const startRank =
    typeof (input as { startRank?: unknown }).startRank === 'number' &&
    Number.isInteger((input as { startRank: number }).startRank) &&
    (input as { startRank: number }).startRank > 0
      ? (input as { startRank: number }).startRank
      : undefined;
  const endRank =
    typeof (input as { endRank?: unknown }).endRank === 'number' &&
    Number.isInteger((input as { endRank: number }).endRank) &&
    (input as { endRank: number }).endRank >= (startRank ?? 0)
      ? (input as { endRank: number }).endRank
      : undefined;
  const participantIndexes = Array.isArray(
    (input as { participantIndexes?: unknown }).participantIndexes,
  )
    ? (input as { participantIndexes: unknown[] }).participantIndexes.filter(
        (value): value is number =>
          typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < MAX_PLAYERS,
      )
    : [];

  if (startRank === undefined || endRank === undefined || participantIndexes.length < 2) {
    return undefined;
  }

  return {
    startRank,
    endRank,
    participantIndexes: [...new Set(participantIndexes)],
  };
}

function normalizeStageRaceResult(input: unknown): StageRaceResult | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const kind = (input as { kind?: unknown }).kind;
  if (kind !== 'standard' && kind !== 'tiebreak') {
    return null;
  }

  const participantIndexes = Array.isArray(
    (input as { participantIndexes?: unknown }).participantIndexes,
  )
    ? (input as { participantIndexes: unknown[] }).participantIndexes.filter(
        (value): value is number =>
          typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < MAX_PLAYERS,
      )
    : [];
  const finishingOrder = Array.isArray((input as { finishingOrder?: unknown }).finishingOrder)
    ? (input as { finishingOrder: unknown[] }).finishingOrder.filter(
        (value): value is number =>
          typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < MAX_PLAYERS,
      )
    : [];

  if (
    participantIndexes.length < 2 ||
    finishingOrder.length !== participantIndexes.length ||
    new Set(participantIndexes).size !== participantIndexes.length ||
    new Set(finishingOrder).size !== finishingOrder.length ||
    participantIndexes.some((value) => !finishingOrder.includes(value))
  ) {
    return null;
  }

  const nextResult: StageRaceResult = {
    participantIndexes,
    finishingOrder,
    kind,
  };

  if (kind === 'tiebreak') {
    const tieBreakBand = normalizeTieBreakBand((input as { tiebreakBand?: unknown }).tiebreakBand);

    if (tieBreakBand) {
      nextResult.tiebreakBand = tieBreakBand;
    }
  }

  return nextResult;
}

function normalizeStageResults(stageResults: unknown): StageResults {
  const nextStageResults = createEmptyStageResults();

  if (!stageResults || typeof stageResults !== 'object') {
    return nextStageResults;
  }

  ALL_STAGE_KEYS.forEach((stageKey) => {
    const results = (stageResults as Partial<Record<StageKey, unknown>>)[stageKey];

    if (!Array.isArray(results)) {
      return;
    }

    nextStageResults[stageKey] = results
      .map((result) => normalizeStageRaceResult(result))
      .filter((result): result is StageRaceResult => result !== null);
  });

  return nextStageResults;
}

function normalizeRaceHistory(raceHistory: unknown): RaceHistory {
  if (!Array.isArray(raceHistory)) {
    return [];
  }

  return raceHistory
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const stageKey = (entry as { stageKey?: unknown }).stageKey;
      if (!isValidStageKey(stageKey)) {
        return null;
      }

      const raceLabel =
        typeof (entry as { raceLabel?: unknown }).raceLabel === 'string'
          ? (entry as { raceLabel: string }).raceLabel
          : '';

      if (!raceLabel) {
        return null;
      }

      return {
        id:
          typeof (entry as { id?: unknown }).id === 'string'
            ? (entry as { id: string }).id
            : `${Date.now()}-${stageKey}`,
        stageKey,
        raceLabel,
        recordedAt:
          typeof (entry as { recordedAt?: unknown }).recordedAt === 'number' &&
          Number.isFinite((entry as { recordedAt: number }).recordedAt)
            ? (entry as { recordedAt: number }).recordedAt
            : Date.now(),
        previousStageResults: cloneStageResults(
          normalizeStageResults((entry as { previousStageResults?: unknown }).previousStageResults),
        ),
      } satisfies RaceHistoryEntry;
    })
    .filter((entry): entry is RaceHistoryEntry => entry !== null)
    .slice(-MAX_RACE_HISTORY);
}

export function isEventIdAllowed(eventId: string) {
  return BUILDINGS.some((building) => building.eventId === eventId);
}

function getEventPath(eventId: string) {
  return `${EVENT_PATH_PREFIX}/${encodeURIComponent(eventId)}.json`;
}

function createEmptyEventDocument(title = EVENT_PRESET.title): StoredEventDocument {
  const now = Date.now();

  return {
    title,
    maxPlayers: MAX_PLAYERS,
    participants: {},
    waitlist: {},
    rosterOrder: [],
    isRosterFinalized: false,
    registrationStatus: getEventRegistrationStatus(0, MAX_PLAYERS, false),
    lockedAt: null,
    stageResults: createEmptyStageResults(),
    raceHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeParticipantMap(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([id, participant]) => {
      const normalized = normalizePlayerRecord({
        id,
        ...(participant as Omit<PlayerRecord, 'id'>),
      });
      const { id: _id, ...payload } = normalized;
      return [id, payload];
    }),
  );
}

export function participantMapToList(value: unknown) {
  if (!value || typeof value !== 'object') {
    return [] as PlayerRecord[];
  }

  return sortParticipantsByCreatedAt(
    Object.entries(value as Record<string, unknown>).map(([id, participant]) =>
      normalizePlayerRecord({
        id,
        ...(participant as Omit<PlayerRecord, 'id'>),
      }),
    ),
  );
}

export function participantListToMap(players: PlayerRecord[]) {
  return Object.fromEntries(
    players
      .filter((player) => player.id)
      .map((player) => {
        const { id, ...payload } = normalizePlayerRecord(player);
        return [id as string, payload];
      }),
  );
}

function normalizeEventDocument(value: unknown, title = EVENT_PRESET.title): StoredEventDocument {
  if (!value || typeof value !== 'object') {
    return createEmptyEventDocument(title);
  }

  const document = value as Partial<StoredEventDocument>;
  const participants = normalizeParticipantMap(document.participants);
  const waitlist = normalizeParticipantMap(document.waitlist);
  const isRosterFinalized = Boolean(document.isRosterFinalized);
  const playersCount = Object.keys(participants).length;
  const registrationStatus = getEventRegistrationStatus(
    playersCount,
    MAX_PLAYERS,
    isRosterFinalized,
  );

  return {
    title: typeof document.title === 'string' ? document.title : title,
    maxPlayers:
      typeof document.maxPlayers === 'number' && Number.isFinite(document.maxPlayers)
        ? document.maxPlayers
        : MAX_PLAYERS,
    participants,
    waitlist,
    rosterOrder: Array.isArray(document.rosterOrder)
      ? document.rosterOrder.map((entry) => normalizeRosterEntry(entry))
      : [],
    isRosterFinalized,
    registrationStatus,
    lockedAt: isRosterFinalized && typeof document.lockedAt === 'number' ? document.lockedAt : null,
    stageResults: normalizeStageResults(document.stageResults),
    raceHistory: normalizeRaceHistory(document.raceHistory),
    createdAt: typeof document.createdAt === 'number' ? document.createdAt : Date.now(),
    updatedAt: typeof document.updatedAt === 'number' ? document.updatedAt : Date.now(),
    lastUpdatedBy: typeof document.lastUpdatedBy === 'string' ? document.lastUpdatedBy : null,
  };
}

export function eventDocumentToPersistedState(document: StoredEventDocument): PersistedEventState {
  const players = participantMapToList(document.participants);
  const waitingPlayers = participantMapToList(document.waitlist);

  return {
    players,
    waitingPlayers,
    rosterOrder: document.rosterOrder,
    isRosterFinalized: document.isRosterFinalized,
    stageResults: document.stageResults,
    raceHistory: document.raceHistory,
    registrationStatus: getEventRegistrationStatus(
      players.length,
      MAX_PLAYERS,
      document.isRosterFinalized,
    ),
    lockedAt:
      document.isRosterFinalized && typeof document.lockedAt === 'number'
        ? document.lockedAt
        : null,
    updatedAt: typeof document.updatedAt === 'number' ? document.updatedAt : Date.now(),
  };
}

export async function readEventDocument(eventId: string, title = EVENT_PRESET.title) {
  const result = await get(getEventPath(eventId), {
    access: 'private',
    useCache: false,
  });

  if (!result || result.statusCode !== 200) {
    return createEmptyEventDocument(title);
  }

  const rawText = await new Response(result.stream).text();

  try {
    return normalizeEventDocument(JSON.parse(rawText), title);
  } catch {
    return createEmptyEventDocument(title);
  }
}

export async function writeEventDocument(eventId: string, document: StoredEventDocument) {
  const normalized = normalizeEventDocument(document, document.title);

  await put(getEventPath(eventId), JSON.stringify(normalized), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });

  return normalized;
}

function normalizePatchValue(value: unknown) {
  return value === undefined ? null : value;
}

function applyCollectionPatch(
  collection: Record<string, Omit<PlayerRecord, 'id'>>,
  segments: string[],
  value: unknown,
) {
  if (segments.length === 1) {
    return value && typeof value === 'object' ? normalizeParticipantMap(value) : {};
  }

  const id = segments[1];

  if (!id) {
    return collection;
  }

  if (segments.length === 2) {
    if (value === null) {
      const nextCollection = { ...collection };
      delete nextCollection[id];
      return nextCollection;
    }

    const normalized = normalizePlayerRecord({
      id,
      ...(value as Omit<PlayerRecord, 'id'>),
    });
    const { id: _id, ...payload } = normalized;

    return {
      ...collection,
      [id]: payload,
    };
  }

  const field = segments[2] as keyof PlayerRecord;
  const current = collection[id] || {
    name: '',
    nickname: '',
    teamTag: '',
  };

  return {
    ...collection,
    [id]: {
      ...current,
      [field]: normalizePatchValue(value),
    },
  };
}

export function applyEventPatch(document: StoredEventDocument, updates: EventPatch) {
  let nextDocument: StoredEventDocument = {
    ...document,
    participants: { ...document.participants },
    waitlist: { ...document.waitlist },
    rosterOrder: [...document.rosterOrder],
    stageResults: normalizeStageResults(document.stageResults),
    raceHistory: normalizeRaceHistory(document.raceHistory),
  };

  Object.entries(updates).forEach(([path, value]) => {
    const segments = path.split('/');
    const root = segments[0];

    if (root === 'participants') {
      nextDocument = {
        ...nextDocument,
        participants: applyCollectionPatch(nextDocument.participants, segments, value),
      };
      return;
    }

    if (root === 'waitlist') {
      nextDocument = {
        ...nextDocument,
        waitlist: applyCollectionPatch(nextDocument.waitlist, segments, value),
      };
      return;
    }

    if (root === 'rosterOrder') {
      nextDocument.rosterOrder = Array.isArray(value)
        ? value.map((entry) => normalizeRosterEntry(entry))
        : [];
      return;
    }

    if (root === 'isRosterFinalized') {
      nextDocument.isRosterFinalized = Boolean(value);
      return;
    }

    if (root === 'registrationStatus') {
      nextDocument.registrationStatus = value as EventRegistrationStatus;
      return;
    }

    if (root === 'lockedAt') {
      nextDocument.lockedAt = typeof value === 'number' ? value : null;
      return;
    }

    if (root === 'stageResults') {
      nextDocument.stageResults = normalizeStageResults(value);
      return;
    }

    if (root === 'raceHistory') {
      nextDocument.raceHistory = normalizeRaceHistory(value);
      return;
    }

    if (root === 'maxPlayers') {
      nextDocument.maxPlayers =
        typeof value === 'number' && Number.isFinite(value) ? value : MAX_PLAYERS;
      return;
    }

    if (root === 'lastUpdatedBy') {
      nextDocument.lastUpdatedBy = typeof value === 'string' ? value : null;
      return;
    }

    if (root === 'updatedAt') {
      nextDocument.updatedAt = typeof value === 'number' ? value : Date.now();
      return;
    }

    if (root === 'title') {
      nextDocument.title = typeof value === 'string' ? value : nextDocument.title;
    }
  });

  if (!('updatedAt' in updates)) {
    nextDocument.updatedAt = Date.now();
  }

  return normalizeEventDocument(nextDocument, nextDocument.title);
}
