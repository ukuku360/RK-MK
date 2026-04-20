import { describe, expect, it } from 'vitest';
import type { PlayerRecord, StageResults } from '../types';
import {
  buildTournamentStages,
  createEmptyBracketEntrant,
  createEmptyStageResults,
} from './bracket';

function createPlayer(index: number): PlayerRecord {
  return {
    id: `driver-${index}`,
    name: `Driver ${index}`,
    nickname: '',
    teamTag: '',
    createdAt: index,
  };
}

describe('group stage helpers', () => {
  it('splits a locked 16-driver draw into four fixed groups', () => {
    const entrants = Array.from({ length: 16 }, (_, index) => createPlayer(index));

    const tournament = buildTournamentStages(
      entrants,
      createEmptyStageResults(),
      true,
    );

    expect(tournament.groupStages.map((stage) => stage.participantIndexes)).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [8, 9, 10, 11],
      [12, 13, 14, 15],
    ]);
    expect(tournament.finalStage.isReady).toBe(false);
  });

  it('awards 10/7/5 points for a three-driver group', () => {
    const entrants = [createPlayer(0), createPlayer(1), createPlayer(2)];
    const stageResults = createEmptyStageResults();

    stageResults['group-a'] = [
      {
        kind: 'standard',
        participantIndexes: [0, 1, 2],
        finishingOrder: [0, 1, 2],
      },
      {
        kind: 'standard',
        participantIndexes: [0, 1, 2],
        finishingOrder: [1, 0, 2],
      },
      {
        kind: 'standard',
        participantIndexes: [0, 1, 2],
        finishingOrder: [1, 2, 0],
      },
    ];

    const tournament = buildTournamentStages(entrants, stageResults, true);
    const standings = tournament.groupStages[0].standings.map((standing) => ({
      entrantIndex: standing.entrantIndex,
      totalPoints: standing.totalPoints,
    }));

    expect(standings).toEqual([
      { entrantIndex: 1, totalPoints: 27 },
      { entrantIndex: 0, totalPoints: 22 },
      { entrantIndex: 2, totalPoints: 17 },
    ]);
    expect(tournament.groupStages[0].winnerIndex).toBe(1);
  });

  it('opens a tie-break when first place is tied in a group and resolves the finalist after it', () => {
    const entrants = [0, 1, 2, 3].map((index) => createPlayer(index));
    const stageResults = createEmptyStageResults();

    stageResults['group-a'] = [
      {
        kind: 'standard',
        participantIndexes: [0, 1, 2, 3],
        finishingOrder: [0, 1, 2, 3],
      },
      {
        kind: 'standard',
        participantIndexes: [0, 1, 2, 3],
        finishingOrder: [1, 2, 0, 3],
      },
      {
        kind: 'standard',
        participantIndexes: [0, 1, 2, 3],
        finishingOrder: [3, 0, 1, 2],
      },
    ];

    const unresolvedTournament = buildTournamentStages(entrants, stageResults, true);
    expect(unresolvedTournament.groupStages[0].pendingTieBreak?.participantIndexes).toEqual([0, 1]);
    expect(unresolvedTournament.finalStage.isReady).toBe(false);

    stageResults['group-a'] = [
      ...stageResults['group-a'],
      {
        kind: 'tiebreak',
        participantIndexes: [0, 1],
        finishingOrder: [1, 0],
        tiebreakBand: {
          startRank: 1,
          endRank: 2,
          participantIndexes: [0, 1],
        },
      },
    ];

    const resolvedTournament = buildTournamentStages(entrants, stageResults, true);
    expect(resolvedTournament.groupStages[0].winnerIndex).toBe(1);
    expect(resolvedTournament.finalStage.isReady).toBe(true);
    expect(resolvedTournament.finalStage.participantIndexes).toEqual([1]);
    expect(resolvedTournament.podium[0]).toBe(1);
  });

  it('resolves final podium ties without adding extra points', () => {
    const entrants = Array.from({ length: 16 }, () => createEmptyBracketEntrant());
    entrants[0] = createPlayer(0);
    entrants[4] = createPlayer(4);
    entrants[8] = createPlayer(8);
    entrants[12] = createPlayer(12);

    const stageResults: StageResults = createEmptyStageResults();
    stageResults.final = [
      {
        kind: 'standard',
        participantIndexes: [0, 4, 8, 12],
        finishingOrder: [0, 4, 8, 12],
      },
      {
        kind: 'standard',
        participantIndexes: [0, 4, 8, 12],
        finishingOrder: [4, 8, 0, 12],
      },
      {
        kind: 'standard',
        participantIndexes: [0, 4, 8, 12],
        finishingOrder: [8, 0, 4, 12],
      },
    ];

    const unresolvedTournament = buildTournamentStages(entrants, stageResults, true);
    expect(unresolvedTournament.finalStage.pendingTieBreak?.participantIndexes).toEqual([0, 4, 8]);

    stageResults.final = [
      ...stageResults.final,
      {
        kind: 'tiebreak',
        participantIndexes: [0, 4, 8],
        finishingOrder: [8, 0, 4],
        tiebreakBand: {
          startRank: 1,
          endRank: 3,
          participantIndexes: [0, 4, 8],
        },
      },
    ];

    const resolvedTournament = buildTournamentStages(entrants, stageResults, true);
    expect(resolvedTournament.finalStage.standings.slice(0, 3).map((standing) => standing.entrantIndex)).toEqual([
      8,
      0,
      4,
    ]);
    expect(resolvedTournament.podium).toEqual([8, 0, 4]);
  });
});
