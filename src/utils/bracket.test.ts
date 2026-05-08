import { describe, expect, it } from 'vitest';
import type { PlayerRecord, StageKey, StageResults } from '../types';
import {
  buildTournamentStages,
  createEmptyBracketEntrant,
  createEmptyStageResults,
  getGroupFinalistDecision,
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

function createRankingResult(participantIndexes: number[], finishingOrder: number[]) {
  return {
    kind: 'standard' as const,
    participantIndexes,
    finishingOrder,
  };
}

function createFullGrid() {
  return Array.from({ length: 16 }, (_, index) => createPlayer(index));
}

function addGroupRanking(
  stageResults: StageResults,
  stageKey: Exclude<StageKey, 'final'>,
  finishingOrder: number[],
) {
  const groupIndexByStage: Record<Exclude<StageKey, 'final'>, number> = {
    'group-a': 0,
    'group-b': 1,
    'group-c': 2,
    'group-d': 3,
  };
  const groupIndex = groupIndexByStage[stageKey];
  const start = groupIndex * 4;
  stageResults[stageKey] = [
    createRankingResult(
      [start, start + 1, start + 2, start + 3],
      finishingOrder,
    ),
  ];
}

describe('direct ranking tournament helpers', () => {
  it('splits a locked 16-driver draw into four fixed groups', () => {
    const tournament = buildTournamentStages(
      createFullGrid(),
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
    expect(tournament.totalStandardRaceCount).toBe(5);
  });

  it('locks a group finalist from one final ranking input', () => {
    const stageResults = createEmptyStageResults();
    stageResults['group-a'] = [createRankingResult([0, 1, 2, 3], [2, 0, 1, 3])];

    const tournament = buildTournamentStages(createFullGrid(), stageResults, true);
    const groupA = tournament.groupStages[0];

    expect(groupA.isFinalized).toBe(true);
    expect(groupA.winnerIndex).toBe(2);
    expect(groupA.completedStandardRaceCount).toBe(1);
    expect(groupA.standings.map((standing) => standing.entrantIndex)).toEqual([2, 0, 1, 3]);
    expect(groupA.standings.every((standing) => standing.totalPoints === 0)).toBe(true);
  });

  it('routes each group winner into the final once all groups are ranked', () => {
    const stageResults = createEmptyStageResults();
    addGroupRanking(stageResults, 'group-a', [1, 0, 2, 3]);
    addGroupRanking(stageResults, 'group-b', [4, 5, 6, 7]);
    addGroupRanking(stageResults, 'group-c', [10, 8, 9, 11]);
    addGroupRanking(stageResults, 'group-d', [15, 12, 13, 14]);

    const tournament = buildTournamentStages(createFullGrid(), stageResults, true);

    expect(tournament.finalStage.isReady).toBe(true);
    expect(tournament.finalStage.participantIndexes).toEqual([1, 4, 10, 15]);
    expect(tournament.finalStage.isFinalized).toBe(false);
  });

  it('uses the final ranking input as the podium order', () => {
    const stageResults = createEmptyStageResults();
    addGroupRanking(stageResults, 'group-a', [1, 0, 2, 3]);
    addGroupRanking(stageResults, 'group-b', [4, 5, 6, 7]);
    addGroupRanking(stageResults, 'group-c', [10, 8, 9, 11]);
    addGroupRanking(stageResults, 'group-d', [15, 12, 13, 14]);
    stageResults.final = [createRankingResult([1, 4, 10, 15], [10, 1, 15, 4])];

    const tournament = buildTournamentStages(createFullGrid(), stageResults, true);

    expect(tournament.finalStage.isFinalized).toBe(true);
    expect(tournament.finalStage.winnerIndex).toBe(10);
    expect(tournament.finalStage.standings.map((standing) => standing.entrantIndex)).toEqual([
      10,
      1,
      15,
      4,
    ]);
    expect(tournament.podium).toEqual([10, 1, 15]);
    expect(tournament.completedStandardRaceCount).toBe(5);
  });

  it('ignores stale final rankings when a group finalist changes', () => {
    const stageResults = createEmptyStageResults();
    addGroupRanking(stageResults, 'group-a', [1, 0, 2, 3]);
    addGroupRanking(stageResults, 'group-b', [4, 5, 6, 7]);
    addGroupRanking(stageResults, 'group-c', [10, 8, 9, 11]);
    addGroupRanking(stageResults, 'group-d', [15, 12, 13, 14]);
    stageResults.final = [createRankingResult([1, 4, 10, 15], [10, 1, 15, 4])];

    stageResults['group-a'] = [createRankingResult([0, 1, 2, 3], [0, 1, 2, 3])];

    const tournament = buildTournamentStages(createFullGrid(), stageResults, true);

    expect(tournament.finalStage.participantIndexes).toEqual([0, 4, 10, 15]);
    expect(tournament.finalStage.isFinalized).toBe(false);
    expect(tournament.podium).toEqual([undefined, undefined, undefined]);
  });

  it('auto-qualifies a one-driver stage without ranking input', () => {
    const tournament = buildTournamentStages([createPlayer(0)], createEmptyStageResults(), true);

    expect(tournament.groupStages[0].isFinalized).toBe(true);
    expect(tournament.groupStages[0].winnerIndex).toBe(0);
    expect(tournament.groupStages[0].raceSlots).toEqual([]);
    expect(tournament.finalStage.isFinalized).toBe(true);
    expect(tournament.podium[0]).toBe(0);
    expect(tournament.totalStandardRaceCount).toBe(0);
  });

  it('announces a group finalist when direct ranking locks the group', () => {
    const entrants = createFullGrid();
    const previousStageResults = createEmptyStageResults();
    const nextStageResults = createEmptyStageResults();
    nextStageResults['group-a'] = [createRankingResult([0, 1, 2, 3], [2, 0, 1, 3])];

    const previousTournament = buildTournamentStages(entrants, previousStageResults, true);
    const nextTournament = buildTournamentStages(entrants, nextStageResults, true);

    expect(
      getGroupFinalistDecision(
        'group-a',
        previousTournament.groupStages,
        nextTournament.groupStages,
        entrants,
      ),
    ).toEqual({
      kind: 'group-finalist',
      stageKey: 'group-a',
      stageTitle: 'Group A',
      finalistIndex: 2,
      finalistName: 'Driver 2',
    });
  });

  it('keeps empty bracket entrants out of group rankings', () => {
    const entrants = Array.from({ length: 16 }, () => createEmptyBracketEntrant());
    entrants[0] = createPlayer(0);
    entrants[1] = createPlayer(1);
    const stageResults = createEmptyStageResults();
    stageResults['group-a'] = [createRankingResult([0, 1], [1, 0])];

    const tournament = buildTournamentStages(entrants, stageResults, true);

    expect(tournament.groupStages[0].participantIndexes).toEqual([0, 1]);
    expect(tournament.groupStages[0].winnerIndex).toBe(1);
    expect(tournament.podium[0]).toBe(1);
  });
});
