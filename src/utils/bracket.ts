import { MAX_PLAYERS } from '../constants';
import type {
  PlayerRecord,
  RosterEntry,
  StageKey,
  StageRaceResult,
  StageResults,
  StageStanding,
  StageTieBreakBand,
  TournamentStage,
} from '../types';

const GROUP_SIZE = 4;
const STANDARD_RACE_COUNT = 3;
const STAGE_POINTS = [10, 7, 5, 3] as const;

export const GROUP_STAGE_KEYS: StageKey[] = ['group-a', 'group-b', 'group-c', 'group-d'];
export const ALL_STAGE_KEYS: StageKey[] = [...GROUP_STAGE_KEYS, 'final'];

interface StageStandingCore {
  entrantIndex: number;
  totalPoints: number;
  finishCounts: [number, number, number, number];
}

function createEmptyFinishCounts(): [number, number, number, number] {
  return [0, 0, 0, 0];
}

function cloneStageRaceResult(result: StageRaceResult): StageRaceResult {
  return {
    participantIndexes: [...result.participantIndexes],
    finishingOrder: [...result.finishingOrder],
    kind: result.kind,
    tiebreakBand: result.tiebreakBand
      ? {
          startRank: result.tiebreakBand.startRank,
          endRank: result.tiebreakBand.endRank,
          participantIndexes: [...result.tiebreakBand.participantIndexes],
        }
      : undefined,
  };
}

function findMatchingTiebreakResult(
  tiebreakResults: StageRaceResult[],
  participantIndexes: number[],
): StageRaceResult | undefined {
  if (participantIndexes.length <= 1) {
    return undefined;
  }

  const sortedIndexes = [...participantIndexes].sort((left, right) => left - right);

  return tiebreakResults.find((result) => {
    if (result.kind !== 'tiebreak' || result.participantIndexes.length !== sortedIndexes.length) {
      return false;
    }

    const sortedResultIndexes = [...result.participantIndexes].sort((left, right) => left - right);
    return sortedResultIndexes.every((value, index) => value === sortedIndexes[index]);
  });
}

function buildOrderedStandings(
  participantIndexes: number[],
  standardResults: StageRaceResult[],
  tiebreakResults: StageRaceResult[],
) {
  const standingsMap = new Map<number, StageStandingCore>();

  participantIndexes.forEach((entrantIndex) => {
    standingsMap.set(entrantIndex, {
      entrantIndex,
      totalPoints: 0,
      finishCounts: createEmptyFinishCounts(),
    });
  });

  standardResults.forEach((result) => {
    const pointsForRace = STAGE_POINTS.slice(0, result.finishingOrder.length);

    result.finishingOrder.forEach((entrantIndex, position) => {
      const standing = standingsMap.get(entrantIndex);

      if (!standing) {
        return;
      }

      standing.totalPoints += pointsForRace[position] ?? 0;

      if (position < standing.finishCounts.length) {
        standing.finishCounts[position] += 1;
      }
    });
  });

  const pointBands: StageStandingCore[][] = [];
  const sorted = [...standingsMap.values()].sort((left, right) => {
    if (left.totalPoints !== right.totalPoints) {
      return right.totalPoints - left.totalPoints;
    }

    return left.entrantIndex - right.entrantIndex;
  });

  sorted.forEach((standing) => {
    const previousBand = pointBands[pointBands.length - 1];

    if (!previousBand || previousBand[0].totalPoints !== standing.totalPoints) {
      pointBands.push([standing]);
      return;
    }

    previousBand.push(standing);
  });

  const nextStandings: StageStanding[] = [];
  const unresolvedBands: StageTieBreakBand[] = [];
  let rank = 1;

  pointBands.forEach((band) => {
    const matchingTiebreak = findMatchingTiebreakResult(
      tiebreakResults,
      band.map((entry) => entry.entrantIndex),
    );
    const isTie = band.length > 1;
    const isTieBroken = Boolean(isTie && matchingTiebreak);
    const orderedBand = matchingTiebreak
      ? [
          ...matchingTiebreak.finishingOrder
            .map((entrantIndex) => band.find((entry) => entry.entrantIndex === entrantIndex))
            .filter((entry): entry is StageStandingCore => entry !== undefined),
          ...band.filter(
            (entry) => !matchingTiebreak.finishingOrder.includes(entry.entrantIndex),
          ),
        ]
      : band;

    if (isTie && !matchingTiebreak) {
      unresolvedBands.push({
        startRank: rank,
        endRank: rank + band.length - 1,
        participantIndexes: band.map((entry) => entry.entrantIndex),
      });
    }

    orderedBand.forEach((entry, index) => {
      nextStandings.push({
        rank: rank + index,
        entrantIndex: entry.entrantIndex,
        totalPoints: entry.totalPoints,
        finishCounts: [...entry.finishCounts] as [number, number, number, number],
        isTie,
        isTieBroken,
      });
    });

    rank += band.length;
  });

  return {
    standings: nextStandings,
    unresolvedBands,
  };
}

function getQualifyingCutoff(stageKey: StageKey, participantCount: number) {
  if (stageKey === 'final') {
    return Math.min(3, participantCount);
  }

  return Math.min(1, participantCount);
}

function getGroupParticipantIndexes(
  stageKey: StageKey,
  entrants: PlayerRecord[],
): number[] {
  if (stageKey === 'final') {
    return [];
  }

  const groupIndex = GROUP_STAGE_KEYS.indexOf(stageKey);
  const start = groupIndex * GROUP_SIZE;

  return entrants
    .slice(start, start + GROUP_SIZE)
    .map((_, index) => start + index)
    .filter((entrantIndex) => {
      const entrant = entrants[entrantIndex];
      return Boolean(entrant && !entrant.empty);
    });
}

function getRaceResultsForStage(stageResults: StageResults, stageKey: StageKey) {
  const results = stageResults[stageKey] ?? [];

  return {
    all: results,
    standard: results.filter((result) => result.kind === 'standard'),
    tiebreak: results.filter((result) => result.kind === 'tiebreak'),
  };
}

function buildStageRaceSlots(
  stageKey: StageKey,
  participantIndexes: number[],
  isReady: boolean,
  standardResults: StageRaceResult[],
  tiebreakResults: StageRaceResult[],
  pendingTieBreak?: StageTieBreakBand,
) {
  const totalStandardRaceCount = participantIndexes.length > 1 ? STANDARD_RACE_COUNT : 0;
  const raceSlots = [];

  for (let index = 0; index < totalStandardRaceCount; index += 1) {
    const result = standardResults[index];
    const isNext = !pendingTieBreak && index === standardResults.length;
    const isCompleted = Boolean(result);

    raceSlots.push({
      key: `${stageKey}-standard-${index}`,
      stageKey,
      raceIndex: index,
      label: `Race ${index + 1}`,
      kind: 'standard' as const,
      participantIndexes,
      result,
      isPending: !isCompleted && isNext,
      isLocked: !isCompleted && (!isReady || !isNext),
    });
  }

  tiebreakResults.forEach((result, index) => {
    raceSlots.push({
      key: `${stageKey}-tiebreak-${index}`,
      stageKey,
      raceIndex: index,
      label: `Tie-break ${index + 1}`,
      kind: 'tiebreak' as const,
      participantIndexes: result.participantIndexes,
      result,
      tiebreakBand: result.tiebreakBand,
      isPending: false,
      isLocked: false,
    });
  });

  if (pendingTieBreak) {
    raceSlots.push({
      key: `${stageKey}-tiebreak-${tiebreakResults.length}`,
      stageKey,
      raceIndex: tiebreakResults.length,
      label: `Tie-break ${tiebreakResults.length + 1}`,
      kind: 'tiebreak' as const,
      participantIndexes: pendingTieBreak.participantIndexes,
      tiebreakBand: pendingTieBreak,
      isPending: true,
      isLocked: !isReady,
    });
  }

  return raceSlots;
}

function buildStage(
  stageKey: StageKey,
  title: string,
  participantIndexes: number[],
  stageResults: StageResults,
  isReady: boolean,
): TournamentStage {
  if (!isReady) {
    return {
      key: stageKey,
      title,
      participantIndexes,
      standings: participantIndexes.map((entrantIndex, index) => ({
        rank: index + 1,
        entrantIndex,
        totalPoints: 0,
        finishCounts: createEmptyFinishCounts(),
        isTie: false,
        isTieBroken: false,
      })),
      raceSlots: buildStageRaceSlots(stageKey, participantIndexes, false, [], []),
      completedStandardRaceCount: 0,
      completedTiebreakCount: 0,
      totalStandardRaceCount: participantIndexes.length > 1 ? STANDARD_RACE_COUNT : 0,
      isReady: false,
      isFinalized: participantIndexes.length <= 1,
      winnerIndex: participantIndexes.length === 1 ? participantIndexes[0] : undefined,
    };
  }

  const { standard, tiebreak } = getRaceResultsForStage(stageResults, stageKey);
  const totalStandardRaceCount = participantIndexes.length > 1 ? STANDARD_RACE_COUNT : 0;
  const { standings, unresolvedBands } = buildOrderedStandings(
    participantIndexes,
    standard,
    tiebreak,
  );
  const qualifyingCutoff = getQualifyingCutoff(stageKey, participantIndexes.length);
  const pendingTieBreak =
    standard.length >= totalStandardRaceCount && totalStandardRaceCount > 0
      ? unresolvedBands.find((band) => band.startRank <= qualifyingCutoff)
      : undefined;
  const raceSlots = buildStageRaceSlots(
    stageKey,
    participantIndexes,
    true,
    standard,
    tiebreak,
    pendingTieBreak,
  );
  const nextRace = raceSlots.find((slot) => slot.isPending && !slot.isLocked);
  const isFinalized =
    participantIndexes.length <= 1 ||
    (standard.length >= totalStandardRaceCount && pendingTieBreak === undefined);

  return {
    key: stageKey,
    title,
    participantIndexes,
    standings,
    raceSlots,
    completedStandardRaceCount: standard.length,
    completedTiebreakCount: tiebreak.length,
    totalStandardRaceCount,
    nextRace,
    pendingTieBreak,
    winnerIndex: isFinalized ? standings[0]?.entrantIndex ?? participantIndexes[0] : undefined,
    isReady: true,
    isFinalized,
  };
}

export function shuffleList<T>(values: T[]): T[] {
  const next = [...values];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export function createEmptyBracketEntrant(): PlayerRecord {
  return {
    name: 'BYE',
    nickname: '',
    teamTag: '',
    empty: true,
    isBye: true,
  };
}

export function createEmptyStageResults(): StageResults {
  return {
    'group-a': [],
    'group-b': [],
    'group-c': [],
    'group-d': [],
    final: [],
  };
}

export function cloneStageResults(stageResults: StageResults): StageResults {
  return ALL_STAGE_KEYS.reduce<StageResults>((nextResults, stageKey) => {
    nextResults[stageKey] = (stageResults[stageKey] ?? []).map(cloneStageRaceResult);
    return nextResults;
  }, createEmptyStageResults());
}

export function clonePlayerRecord(
  player: PlayerRecord | null | undefined,
  overrides: Partial<PlayerRecord> = {},
): PlayerRecord | null {
  if (!player) {
    return null;
  }

  return {
    ...player,
    ...overrides,
  };
}

export function getPlayerSelectionKey(player: PlayerRecord | null | undefined): string {
  if (!player) {
    return '';
  }

  return player.id || `${player.name}|${player.nickname}|${player.teamTag}`;
}

export function rosterOrderUsesIds(order: RosterEntry[]): boolean {
  return Array.isArray(order) && order.some((entry) => typeof entry === 'string');
}

export function rosterEntryMatchesPlayer(
  entry: RosterEntry | undefined,
  player: PlayerRecord | null | undefined,
): boolean {
  if (!entry || !player) {
    return false;
  }

  if (typeof entry === 'string') {
    return Boolean(player.id) && entry === player.id;
  }

  if (entry.id && player.id && entry.id === player.id) {
    return true;
  }

  const entryKey = getPlayerSelectionKey(entry);
  const playerKey = getPlayerSelectionKey(player);

  if (!entryKey || !playerKey || entryKey !== playerKey) {
    return false;
  }

  const entryCreatedAt = entry.createdAt ?? '';
  const playerCreatedAt = player.createdAt ?? '';

  return entryCreatedAt === playerCreatedAt || !entryCreatedAt || !playerCreatedAt;
}

export function findPlayerIndexInList(
  player: PlayerRecord | null | undefined,
  list: PlayerRecord[],
): number {
  if (!player) {
    return -1;
  }

  return list.findIndex((candidate) => rosterEntryMatchesPlayer(candidate, player));
}

export function findRosterSlotIndexForPlayer(
  player: PlayerRecord | null | undefined,
  order: RosterEntry[],
): number {
  if (!player) {
    return -1;
  }

  return order.findIndex((entry) => rosterEntryMatchesPlayer(entry, player));
}

export function buildRosterEntryForPlayer(
  player: PlayerRecord | null | undefined,
  order: RosterEntry[],
): RosterEntry {
  if (!player) {
    return null;
  }

  if (rosterOrderUsesIds(order)) {
    return player.id || null;
  }

  return clonePlayerRecord(player);
}

export function getBracketEntrants(
  players: PlayerRecord[],
  rosterOrder: RosterEntry[],
  isRosterFinalized: boolean,
): PlayerRecord[] {
  if (!isRosterFinalized || !rosterOrder.length) {
    return [...players];
  }

  const playersById = new Map(
    players
      .filter((player) => player.id)
      .map((player) => [player.id as string, player]),
  );
  const ordered: PlayerRecord[] = [];

  if (rosterOrderUsesIds(rosterOrder)) {
    for (const entry of rosterOrder) {
      if (typeof entry !== 'string') {
        ordered.push(createEmptyBracketEntrant());
        continue;
      }

      ordered.push(playersById.get(entry) || createEmptyBracketEntrant());
    }

    return ordered;
  }

  for (const player of rosterOrder) {
    if (!player || typeof player === 'string') {
      ordered.push(createEmptyBracketEntrant());
      continue;
    }

    ordered.push(clonePlayerRecord(player) || createEmptyBracketEntrant());
  }

  return ordered;
}

export function padEntrantsToGrid(entrants: PlayerRecord[]) {
  const nextEntrants = [...entrants];

  while (nextEntrants.length < MAX_PLAYERS) {
    nextEntrants.push(createEmptyBracketEntrant());
  }

  return nextEntrants;
}

export function buildPromotedParticipantState(
  waitingPlayer: PlayerRecord | null | undefined,
  displacedPlayer: PlayerRecord | null | undefined,
  overrideId = waitingPlayer?.id,
): PlayerRecord | null {
  if (!waitingPlayer) {
    return null;
  }

  return clonePlayerRecord(waitingPlayer, {
    id: overrideId || waitingPlayer.id,
    createdAt: displacedPlayer?.createdAt ?? waitingPlayer.createdAt ?? Date.now(),
  });
}

export function getStageTitle(stageKey: StageKey) {
  if (stageKey === 'final') {
    return 'Final';
  }

  return `Group ${stageKey.split('-')[1]?.toUpperCase()}`;
}

export function buildTournamentStages(
  entrants: PlayerRecord[],
  stageResults: StageResults,
  isRosterFinalized: boolean,
) {
  if (!isRosterFinalized) {
    const emptyGroups = GROUP_STAGE_KEYS.map((stageKey) =>
      buildStage(stageKey, getStageTitle(stageKey), [], createEmptyStageResults(), false),
    );
    const emptyFinal = buildStage('final', 'Final', [], createEmptyStageResults(), false);

    return {
      groupStages: emptyGroups,
      finalStage: emptyFinal,
      finalParticipantIndexes: [] as number[],
      podium: [undefined, undefined, undefined] as Array<number | undefined>,
      completedStandardRaceCount: 0,
      totalStandardRaceCount: GROUP_STAGE_KEYS.length * STANDARD_RACE_COUNT + STANDARD_RACE_COUNT,
      completedTieBreakCount: 0,
    };
  }

  const normalizedStageResults = cloneStageResults(stageResults);
  const paddedEntrants = padEntrantsToGrid(entrants);
  const groupStages = GROUP_STAGE_KEYS.map((stageKey) =>
    buildStage(
      stageKey,
      getStageTitle(stageKey),
      getGroupParticipantIndexes(stageKey, paddedEntrants),
      normalizedStageResults,
      true,
    ),
  );
  const finalParticipantIndexes = groupStages
    .map((stage) => stage.winnerIndex)
    .filter((entrantIndex): entrantIndex is number => entrantIndex !== undefined);
  const finalReady = groupStages.every(
    (stage) => stage.participantIndexes.length === 0 || stage.isFinalized,
  );
  const finalStage = buildStage(
    'final',
    'Final',
    finalParticipantIndexes,
    normalizedStageResults,
    finalReady,
  );
  const finalStandings = finalStage.isFinalized ? finalStage.standings : [];
  const podium = [
    finalStandings[0]?.entrantIndex,
    finalStandings[1]?.entrantIndex,
    finalStandings[2]?.entrantIndex,
  ];

  return {
    groupStages,
    finalStage,
    finalParticipantIndexes,
    podium,
    completedStandardRaceCount:
      groupStages.reduce((total, stage) => total + stage.completedStandardRaceCount, 0) +
      finalStage.completedStandardRaceCount,
    totalStandardRaceCount: GROUP_STAGE_KEYS.length * STANDARD_RACE_COUNT + STANDARD_RACE_COUNT,
    completedTieBreakCount:
      groupStages.reduce((total, stage) => total + stage.completedTiebreakCount, 0) +
      finalStage.completedTiebreakCount,
  };
}
