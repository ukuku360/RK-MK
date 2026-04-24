import { describe, expect, it } from 'vitest';
import type { StoredEventDocument } from './eventStore';
import { applyEventPatch, eventDocumentToPersistedState } from './eventStore';

function createStoredDocument(overrides: Partial<StoredEventDocument> = {}): StoredEventDocument {
  return {
    title: 'Test Event',
    maxPlayers: 16,
    participants: {
      'driver-1': {
        name: 'Driver 1',
        nickname: '',
        teamTag: '',
        createdAt: 1,
      },
    },
    waitlist: {},
    rosterOrder: [],
    isRosterFinalized: false,
    registrationStatus: 'open',
    lockedAt: null,
    stageResults: {
      'group-a': [],
      'group-b': [],
      'group-c': [],
      'group-d': [],
      final: [],
    },
    raceHistory: [],
    createdAt: 1,
    updatedAt: 1,
    lastUpdatedBy: null,
    ...overrides,
  };
}

describe('event store state normalization', () => {
  it('recalculates stale locked registration status when a draw is reset', () => {
    const nextDocument = applyEventPatch(
      createStoredDocument({
        isRosterFinalized: true,
        registrationStatus: 'locked',
        lockedAt: 10,
        rosterOrder: ['driver-1'],
      }),
      {
        isRosterFinalized: false,
        registrationStatus: 'locked',
        lockedAt: null,
        rosterOrder: [],
        stageResults: {
          'group-a': [],
          'group-b': [],
          'group-c': [],
          'group-d': [],
          final: [],
        },
        raceHistory: [],
      },
    );

    expect(nextDocument.isRosterFinalized).toBe(false);
    expect(nextDocument.registrationStatus).toBe('open');
    expect(nextDocument.lockedAt).toBeNull();
    expect(nextDocument.rosterOrder).toEqual([]);
  });

  it('exports persisted state with status scoped to the current document', () => {
    const persistedState = eventDocumentToPersistedState(
      createStoredDocument({
        isRosterFinalized: false,
        registrationStatus: 'locked',
        lockedAt: 10,
      }),
    );

    expect(persistedState.registrationStatus).toBe('open');
    expect(persistedState.lockedAt).toBeNull();
    expect(persistedState.players).toHaveLength(1);
  });

  it('clears all building-scoped data for reset event patches', () => {
    const nextDocument = applyEventPatch(
      createStoredDocument({
        waitlist: {
          'waitlist-1': {
            name: 'Waiting Driver',
            nickname: '',
            teamTag: '',
            createdAt: 2,
          },
        },
        isRosterFinalized: true,
        registrationStatus: 'locked',
        lockedAt: 10,
        rosterOrder: ['driver-1'],
        stageResults: {
          'group-a': [
            {
              kind: 'standard',
              participantIndexes: [0, 1],
              finishingOrder: [0, 1],
            },
          ],
          'group-b': [],
          'group-c': [],
          'group-d': [],
          final: [],
        },
        raceHistory: [
          {
            id: 'race-1',
            stageKey: 'group-a',
            raceLabel: 'Race 1',
            recordedAt: 10,
            previousStageResults: {
              'group-a': [],
              'group-b': [],
              'group-c': [],
              'group-d': [],
              final: [],
            },
          },
        ],
      }),
      {
        participants: null,
        waitlist: null,
        rosterOrder: [],
        isRosterFinalized: false,
        registrationStatus: 'open',
        lockedAt: null,
        stageResults: {
          'group-a': [],
          'group-b': [],
          'group-c': [],
          'group-d': [],
          final: [],
        },
        raceHistory: [],
      },
    );

    expect(nextDocument.participants).toEqual({});
    expect(nextDocument.waitlist).toEqual({});
    expect(nextDocument.rosterOrder).toEqual([]);
    expect(nextDocument.isRosterFinalized).toBe(false);
    expect(nextDocument.registrationStatus).toBe('open');
    expect(nextDocument.lockedAt).toBeNull();
    expect(nextDocument.stageResults).toEqual({
      'group-a': [],
      'group-b': [],
      'group-c': [],
      'group-d': [],
      final: [],
    });
    expect(nextDocument.raceHistory).toEqual([]);
  });
});
