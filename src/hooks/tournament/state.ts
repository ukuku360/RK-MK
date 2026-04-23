import type { DataSnapshot } from 'firebase/database';
import { EVENT_STATE_STORAGE_PREFIX, MAX_PLAYERS } from '../../constants';
import type {
  PersistedEventState,
  PlayerRecord,
  RaceHistory,
  RaceHistoryEntry,
  RosterEntry,
  StageKey,
  StageRaceResult,
  StageResults,
  StageTieBreakBand,
} from '../../types';
import { ALL_STAGE_KEYS, cloneStageResults, createEmptyStageResults } from '../../utils/bracket';
import {
  getEventRegistrationStatus,
  normalizePlayerRecord,
} from '../../utils/registration';

export const MAX_RACE_HISTORY = 24;
export const PERSISTED_EVENT_STATE_CHANGE_EVENT = 'rk-event-state-change';

export function normalizeRosterEntry(entry: RosterEntry | null | undefined): RosterEntry {
  if (!entry || typeof entry === 'string') {
    return entry ?? null;
  }

  return normalizePlayerRecord(entry);
}

export function snapshotToPlayerRecords(snapshot: DataSnapshot | null) {
  const records: PlayerRecord[] = [];

  if (!snapshot?.exists()) {
    return records;
  }

  snapshot.forEach((docItem) => {
    records.push(
      normalizePlayerRecord({
        id: docItem.key ?? undefined,
        ...(docItem.val() as Omit<PlayerRecord, 'id'>),
      }),
    );
  });

  return records;
}

export function getSnapshotChildCount(snapshot: DataSnapshot | null) {
  if (!snapshot?.exists()) {
    return 0;
  }

  if (typeof snapshot.size === 'number') {
    return snapshot.size;
  }

  let childCount = 0;
  snapshot.forEach(() => {
    childCount += 1;
  });

  return childCount;
}

export function isSeededTestPlayer(player: PlayerRecord | null | undefined) {
  if (!player) {
    return false;
  }

  const id = player.id || '';
  const name = player.name || '';
  const nickname = player.nickname || '';
  const lastUpdatedBy = player.lastUpdatedBy || '';

  return (
    id.startsWith('seed-') ||
    lastUpdatedBy === 'local-dev-seed' ||
    (/^Test Player \d+$/.test(name) && nickname === 'Test tag') ||
    /^Demo Player \d+$/.test(name)
  );
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
  const participantIndexes = Array.isArray((input as { participantIndexes?: unknown }).participantIndexes)
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

  const participantIndexes = Array.isArray((input as { participantIndexes?: unknown }).participantIndexes)
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

export function normalizeStageResults(stageResults: unknown): StageResults {
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

export function normalizeRaceHistory(raceHistory: unknown): RaceHistory {
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

export function sanitizePersistedState(
  state: PersistedEventState,
): PersistedEventState {
  const rawPlayers = Array.isArray(state.players) ? state.players : [];
  const rawWaitingPlayers = Array.isArray(state.waitingPlayers) ? state.waitingPlayers : [];
  const rawRosterOrder = Array.isArray(state.rosterOrder) ? state.rosterOrder : [];
  const nextPlayers = rawPlayers
    .map((player) => normalizePlayerRecord(player))
    .filter((player) => !isSeededTestPlayer(player));
  const nextWaitingPlayers = rawWaitingPlayers
    .map((player) => normalizePlayerRecord(player))
    .filter((player) => !isSeededTestPlayer(player));
  const nextRosterOrder = rawRosterOrder.map((entry) => normalizeRosterEntry(entry));
  const removedSeededPlayers =
    nextPlayers.length !== rawPlayers.length || nextWaitingPlayers.length !== rawWaitingPlayers.length;
  const registrationStatus =
    !removedSeededPlayers && state.registrationStatus
      ? state.registrationStatus
      :
    getEventRegistrationStatus(nextPlayers.length, MAX_PLAYERS, Boolean(state.isRosterFinalized));
  const lockedAt = typeof state.lockedAt === 'number' ? state.lockedAt : null;
  const nextStageResults = state.isRosterFinalized
    ? normalizeStageResults((state as PersistedEventState & { stageResults?: unknown }).stageResults)
    : createEmptyStageResults();
  const nextRaceHistory = state.isRosterFinalized
    ? normalizeRaceHistory((state as PersistedEventState & { raceHistory?: unknown }).raceHistory)
    : [];
  const sanitizedState: PersistedEventState = {
    ...state,
    players: nextPlayers,
    waitingPlayers: nextWaitingPlayers,
    rosterOrder: nextRosterOrder,
    stageResults: nextStageResults,
    raceHistory: nextRaceHistory,
    registrationStatus,
    lockedAt,
  };

  if (
    !state.isRosterFinalized ||
    removedSeededPlayers ||
    nextRosterOrder.length !== rawRosterOrder.length
  ) {
    return {
      ...sanitizedState,
      isRosterFinalized: Boolean(state.isRosterFinalized) && nextRosterOrder.length > 0,
      stageResults: createEmptyStageResults(),
      raceHistory: [],
    };
  }

  return sanitizedState;
}

export function loadPersistedEventState(eventId: string): PersistedEventState | null {
  const rawState = localStorage.getItem(`${EVENT_STATE_STORAGE_PREFIX}${eventId}`);

  if (!rawState) {
    return null;
  }

  try {
    return sanitizePersistedState(JSON.parse(rawState) as PersistedEventState);
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function loadPersistedEventStateForMonitor(eventId: string): PersistedEventState | null {
  const rawState = localStorage.getItem(`${EVENT_STATE_STORAGE_PREFIX}${eventId}`);

  if (!rawState) {
    return null;
  }

  try {
    return sanitizePersistedState(JSON.parse(rawState) as PersistedEventState);
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function persistEventState(eventId: string, state: PersistedEventState) {
  localStorage.setItem(
    `${EVENT_STATE_STORAGE_PREFIX}${eventId}`,
    JSON.stringify(state),
  );

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(PERSISTED_EVENT_STATE_CHANGE_EVENT, {
        detail: { eventId },
      }),
    );
  }
}
