import { MAX_PLAYERS } from '../constants';
import type {
  PlayerRecord,
  RosterEntry,
  SelectionResult,
  StageKey,
  StageRaceResult,
  StageResults,
  StageStanding,
  TournamentStage,
} from '../types';

const GROUP_SIZE = 4;
const RANKING_INPUT_COUNT = 1;

export const GROUP_STAGE_KEYS: StageKey[] = ['group-a', 'group-b', 'group-c', 'group-d'];
export const ALL_STAGE_KEYS: StageKey[] = [...GROUP_STAGE_KEYS, 'final'];

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

function createStageStanding(entrantIndex: number, rank: number): StageStanding {
  return {
    rank,
    entrantIndex,
    totalPoints: 0,
    finishCounts: createEmptyFinishCounts(),
    isTie: false,
    isTieBroken: false,
  };
}

function resultMatchesStageParticipants(
  result: StageRaceResult | undefined,
  participantIndexes: number[],
): result is StageRaceResult {
  if (!result || result.kind !== 'standard') {
    return false;
  }

  const participantSet = new Set(participantIndexes);
  const resultParticipantSet = new Set(result.participantIndexes);
  const finishingSet = new Set(result.finishingOrder);

  return (
    participantIndexes.length > 1 &&
    result.participantIndexes.length === participantIndexes.length &&
    result.finishingOrder.length === participantIndexes.length &&
    resultParticipantSet.size === participantIndexes.length &&
    finishingSet.size === participantIndexes.length &&
    participantIndexes.every((entrantIndex) => resultParticipantSet.has(entrantIndex)) &&
    result.finishingOrder.every((entrantIndex) => participantSet.has(entrantIndex))
  );
}

function getFinalRankingResult(
  stageResults: StageResults,
  stageKey: StageKey,
  participantIndexes: number[],
) {
  const [result] = stageResults[stageKey] ?? [];
  return resultMatchesStageParticipants(result, participantIndexes) ? result : undefined;
}

function buildDirectStandings(
  participantIndexes: number[],
  finalRankingResult?: StageRaceResult,
) {
  const orderedParticipantIndexes = finalRankingResult
    ? finalRankingResult.finishingOrder
    : participantIndexes;

  return orderedParticipantIndexes.map((entrantIndex, index) =>
    createStageStanding(entrantIndex, index + 1),
  );
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

function buildStageRaceSlots(
  stageKey: StageKey,
  participantIndexes: number[],
  isReady: boolean,
  finalRankingResult?: StageRaceResult,
) {
  if (!isReady || participantIndexes.length <= 1) {
    return [];
  }

  return [
    {
      key: `${stageKey}-ranking`,
      stageKey,
      raceIndex: 0,
      label: 'Final Ranking',
      kind: 'standard' as const,
      participantIndexes,
      result: finalRankingResult,
      isPending: !finalRankingResult,
      isLocked: false,
    },
  ];
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
      standings: participantIndexes.map((entrantIndex, index) =>
        createStageStanding(entrantIndex, index + 1),
      ),
      raceSlots: buildStageRaceSlots(stageKey, participantIndexes, false),
      completedStandardRaceCount: 0,
      completedTiebreakCount: 0,
      totalStandardRaceCount: 0,
      isReady: false,
      isFinalized: false,
      winnerIndex: undefined,
    };
  }

  const finalRankingResult = getFinalRankingResult(
    stageResults,
    stageKey,
    participantIndexes,
  );
  const totalStandardRaceCount =
    participantIndexes.length > 1 ? RANKING_INPUT_COUNT : 0;
  const standings = buildDirectStandings(participantIndexes, finalRankingResult);
  const raceSlots = buildStageRaceSlots(
    stageKey,
    participantIndexes,
    true,
    finalRankingResult,
  );
  const nextRace = raceSlots.find((slot) => slot.isPending && !slot.isLocked);
  const isFinalized =
    participantIndexes.length <= 1 ||
    Boolean(finalRankingResult);

  return {
    key: stageKey,
    title,
    participantIndexes,
    standings,
    raceSlots,
    completedStandardRaceCount: finalRankingResult ? RANKING_INPUT_COUNT : 0,
    completedTiebreakCount: 0,
    totalStandardRaceCount,
    nextRace,
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

export function getGroupFinalistDecision(
  stageKey: StageKey,
  previousGroupStages: TournamentStage[],
  nextGroupStages: TournamentStage[],
  entrants: PlayerRecord[],
): Extract<SelectionResult, { kind: 'group-finalist' }> | null {
  if (stageKey === 'final') {
    return null;
  }

  const previousStage = previousGroupStages.find((stage) => stage.key === stageKey);
  const nextStage = nextGroupStages.find((stage) => stage.key === stageKey);

  if (!nextStage?.isFinalized || nextStage.winnerIndex === undefined) {
    return null;
  }

  if (previousStage?.isFinalized && previousStage.winnerIndex === nextStage.winnerIndex) {
    return null;
  }

  const finalist = entrants[nextStage.winnerIndex];

  return {
    kind: 'group-finalist',
    stageKey: nextStage.key,
    stageTitle: nextStage.title,
    finalistIndex: nextStage.winnerIndex,
    finalistName: finalist && !finalist.empty ? finalist.name : 'TBD',
  };
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
      totalStandardRaceCount: 0,
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
  const expectedFinalistCount = groupStages.filter(
    (stage) => stage.participantIndexes.length > 0,
  ).length;
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
    totalStandardRaceCount:
      groupStages.reduce((total, stage) => total + stage.totalStandardRaceCount, 0) +
      (expectedFinalistCount > 1 ? RANKING_INPUT_COUNT : 0),
    completedTieBreakCount: 0,
  };
}
