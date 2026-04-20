import { describe, expect, it } from 'vitest';
import {
  applyParticipantRegistration,
  buildParticipantSignature,
  getEventRegistrationStatus,
} from './registration';

describe('registration helpers', () => {
  it('adds drivers to the grid until capacity is reached', () => {
    const result = applyParticipantRegistration({
      players: [],
      waitingPlayers: [],
      input: {
        name: 'Minji',
        nickname: 'Bullet Bill',
        teamTag: 'Red Shell',
      },
      maxPlayers: 16,
      isRosterFinalized: false,
      createId: () => 'driver-1',
      timestamp: 1,
      updatedBy: 'test',
    });

    expect(result.outcome).toBe('active');
    expect(result.players).toHaveLength(1);
    expect(result.waitingPlayers).toHaveLength(0);
    expect(result.players[0]?.id).toBe('driver-1');
  });

  it('moves overflow signups into the waitlist', () => {
    const players = Array.from({ length: 16 }, (_, index) => ({
      id: `driver-${index}`,
      name: `Driver ${index}`,
      nickname: '',
      teamTag: '',
      createdAt: index,
    }));

    const result = applyParticipantRegistration({
      players,
      waitingPlayers: [],
      input: {
        name: 'Overflow Driver',
        nickname: '',
        teamTag: '',
      },
      maxPlayers: 16,
      isRosterFinalized: false,
      createId: () => 'driver-overflow',
      timestamp: 17,
      updatedBy: 'test',
    });

    expect(result.outcome).toBe('waitlist');
    expect(result.players).toHaveLength(16);
    expect(result.waitingPlayers).toHaveLength(1);
    expect(result.waitingPlayers[0]?.id).toBe('driver-overflow');
  });

  it('blocks duplicate registrations using normalized values', () => {
    const existingPlayer = {
      id: 'driver-1',
      name: 'Minji',
      nickname: 'Bullet Bill',
      teamTag: 'Red Shell',
      createdAt: 1,
    };

    const result = applyParticipantRegistration({
      players: [existingPlayer],
      waitingPlayers: [],
      input: {
        name: '  minji ',
        nickname: 'bullet bill',
        teamTag: 'red shell  ',
      },
      maxPlayers: 16,
      isRosterFinalized: false,
      createId: () => 'driver-2',
      timestamp: 2,
      updatedBy: 'test',
    });

    expect(result.outcome).toBe('duplicate');
    expect(result.players).toHaveLength(1);
    expect(buildParticipantSignature(existingPlayer)).toBe(
      buildParticipantSignature({
        name: 'minji',
        nickname: 'bullet bill',
        teamTag: 'red shell',
      }),
    );
  });

  it('rejects registrations after the bracket is locked', () => {
    const result = applyParticipantRegistration({
      players: [],
      waitingPlayers: [],
      input: {
        name: 'Late Driver',
        nickname: '',
        teamTag: '',
      },
      maxPlayers: 16,
      isRosterFinalized: true,
      createId: () => 'driver-late',
      timestamp: 3,
      updatedBy: 'test',
    });

    expect(result.outcome).toBe('locked');
  });

  it('derives event registration status from current capacity and lock state', () => {
    expect(getEventRegistrationStatus(0, 16, false)).toBe('open');
    expect(getEventRegistrationStatus(14, 16, false)).toBe('nearly-full');
    expect(getEventRegistrationStatus(16, 16, false)).toBe('full');
    expect(getEventRegistrationStatus(10, 16, true)).toBe('locked');
  });
});
