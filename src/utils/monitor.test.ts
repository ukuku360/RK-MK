import { describe, expect, it } from 'vitest';
import { getBuildingOperationalStatus } from './monitor';

describe('monitor status helpers', () => {
  it('treats loading and sync failures as operational states', () => {
    expect(
      getBuildingOperationalStatus({
        connectionState: 'loading',
        playersCount: 0,
        isRosterFinalized: false,
      }),
    ).toBe('connecting');

    expect(
      getBuildingOperationalStatus({
        connectionState: 'error',
        playersCount: 8,
        isRosterFinalized: false,
      }),
    ).toBe('sync-issue');
  });

  it('reports locked and full buildings correctly', () => {
    expect(
      getBuildingOperationalStatus({
        connectionState: 'live',
        playersCount: 12,
        isRosterFinalized: true,
      }),
    ).toBe('locked');

    expect(
      getBuildingOperationalStatus({
        connectionState: 'live',
        playersCount: 16,
        isRosterFinalized: false,
      }),
    ).toBe('full');
  });

  it('reports nearly full before the grid is completely full', () => {
    expect(
      getBuildingOperationalStatus({
        connectionState: 'live',
        playersCount: 14,
        isRosterFinalized: false,
      }),
    ).toBe('nearly-full');
  });
});
