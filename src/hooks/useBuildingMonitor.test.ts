import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILDING_CONFIGS, EVENT_STATE_STORAGE_PREFIX } from '../constants';
import type { PersistedEventState, PlayerRecord } from '../types';
import { createEmptyStageResults } from '../utils/bracket';
import { createLocalMonitorSnapshot } from './useBuildingMonitor';

function createStorageMock(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  } satisfies Storage;
}

function createState(overrides: Partial<PersistedEventState> = {}): PersistedEventState {
  return {
    players: [],
    waitingPlayers: [],
    rosterOrder: [],
    isRosterFinalized: false,
    stageResults: createEmptyStageResults(),
    raceHistory: [],
    registrationStatus: 'open',
    lockedAt: null,
    updatedAt: 100,
    ...overrides,
  };
}

function createSeedPlayers(count: number): PlayerRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `seed-spire-${index + 1}`,
    name: `Resident ${index + 1}`,
    nickname: '',
    teamTag: 'Spire',
    createdAt: index + 1,
    lastUpdatedBy: 'local-dev-seed',
  }));
}

function createPlayers(count: number): PlayerRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `driver-${index + 1}`,
    name: `Resident ${index + 1}`,
    nickname: '',
    teamTag: 'Spire',
    createdAt: index + 1,
  }));
}

function writeLocalState(eventId: string, state: PersistedEventState) {
  localStorage.setItem(`${EVENT_STATE_STORAGE_PREFIX}${eventId}`, JSON.stringify(state));
}

describe('local building monitor snapshots', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an offline empty snapshot when no local event state exists', () => {
    const snapshot = createLocalMonitorSnapshot(BUILDING_CONFIGS.spire);

    expect(snapshot.playersCount).toBe(0);
    expect(snapshot.waitingPlayersCount).toBe(0);
    expect(snapshot.registrationStatus).toBe('open');
    expect(snapshot.connectionState).toBe('offline');
  });

  it('ignores seeded local players from local state', () => {
    writeLocalState(
      BUILDING_CONFIGS.spire.eventId,
      createState({
        players: createSeedPlayers(16),
        registrationStatus: 'full',
        updatedAt: 1234,
      }),
    );

    const snapshot = createLocalMonitorSnapshot(BUILDING_CONFIGS.spire);

    expect(snapshot.playersCount).toBe(0);
    expect(snapshot.registrationStatus).toBe('open');
    expect(snapshot.updatedAt).toBe(1234);
  });

  it('includes waitlist count and locked state from local state', () => {
    writeLocalState(
      BUILDING_CONFIGS.spire.eventId,
      createState({
        players: createPlayers(16),
        waitingPlayers: [
          {
            id: 'waitlist-1',
            name: 'Waiting Resident',
            nickname: '',
            teamTag: '',
          },
        ],
        isRosterFinalized: true,
        registrationStatus: 'locked',
      }),
    );

    const snapshot = createLocalMonitorSnapshot(BUILDING_CONFIGS.spire);

    expect(snapshot.waitingPlayersCount).toBe(1);
    expect(snapshot.isRosterFinalized).toBe(true);
    expect(snapshot.registrationStatus).toBe('locked');
  });
});
