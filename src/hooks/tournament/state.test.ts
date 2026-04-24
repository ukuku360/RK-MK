import { describe, expect, it } from 'vitest';
import type { PersistedEventState } from '../../types';
import { createEmptyStageResults } from '../../utils/bracket';
import { sanitizePersistedState } from './state';

function createPersistedState(overrides: Partial<PersistedEventState> = {}): PersistedEventState {
  return {
    players: [
      {
        id: 'driver-1',
        name: 'Driver 1',
        nickname: '',
        teamTag: '',
        createdAt: 1,
      },
    ],
    waitingPlayers: [],
    rosterOrder: ['driver-1'],
    isRosterFinalized: true,
    stageResults: createEmptyStageResults(),
    raceHistory: [],
    registrationStatus: 'locked',
    lockedAt: 10,
    updatedAt: 10,
    ...overrides,
  };
}

describe('tournament state helpers', () => {
  it('normalizes legacy persisted state without match data into empty stage results', () => {
    const legacyState = {
      ...createPersistedState(),
      stageResults: undefined,
      raceHistory: undefined,
      matchWinners: {
        '1-0': 0,
      },
      matchScores: {
        '1-0': {
          left: 1,
          right: 0,
        },
      },
    } as unknown as PersistedEventState;

    const sanitized = sanitizePersistedState(legacyState);

    expect(sanitized.stageResults).toEqual(createEmptyStageResults());
    expect(sanitized.raceHistory).toEqual([]);
  });

  it('drops saved stage progress when the roster is no longer finalized', () => {
    const state = createPersistedState({
      isRosterFinalized: false,
      stageResults: {
        ...createEmptyStageResults(),
        'group-a': [
          {
            kind: 'standard',
            participantIndexes: [0, 1, 2, 3],
            finishingOrder: [0, 1, 2, 3],
          },
        ],
      },
    });

    const sanitized = sanitizePersistedState(state);

    expect(sanitized.stageResults).toEqual(createEmptyStageResults());
    expect(sanitized.raceHistory).toEqual([]);
  });

  it('removes seeded players from persisted local state', () => {
    const seededPlayers = Array.from({ length: 16 }, (_, index) => ({
      id: `seed-swanston-${index + 1}`,
      name: `Resident ${index + 1}`,
      nickname: '',
      teamTag: 'Spire',
      createdAt: index + 1,
      lastUpdatedBy: 'local-dev-seed',
    }));
    const state = createPersistedState({
      players: seededPlayers,
      rosterOrder: [],
      isRosterFinalized: false,
      registrationStatus: 'full',
    });

    expect(sanitizePersistedState(state).players).toHaveLength(0);
  });

  it('reopens stale locked local state after the draw has been reset', () => {
    const state = createPersistedState({
      rosterOrder: [],
      isRosterFinalized: false,
      registrationStatus: 'locked',
      lockedAt: 10,
    });

    const sanitized = sanitizePersistedState(state);

    expect(sanitized.isRosterFinalized).toBe(false);
    expect(sanitized.registrationStatus).toBe('open');
    expect(sanitized.lockedAt).toBeNull();
    expect(sanitized.stageResults).toEqual(createEmptyStageResults());
    expect(sanitized.raceHistory).toEqual([]);
  });
});
