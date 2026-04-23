export interface ParticipantRecord {
  id?: string;
  name: string;
  nickname: string;
  teamTag: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastUpdatedBy?: string | null;
  checkedIn?: boolean;
  empty?: boolean;
  isBye?: boolean;
}

export type PlayerRecord = ParticipantRecord;
export type RosterEntry = string | ParticipantRecord | null;

export type StageKey = 'group-a' | 'group-b' | 'group-c' | 'group-d' | 'final';
export type StageRaceKind = 'standard' | 'tiebreak';

export interface StageTieBreakBand {
  startRank: number;
  endRank: number;
  participantIndexes: number[];
}

export interface StageRaceResult {
  participantIndexes: number[];
  finishingOrder: number[];
  kind: StageRaceKind;
  tiebreakBand?: StageTieBreakBand;
}

export type StageResults = Record<StageKey, StageRaceResult[]>;

export interface RaceHistoryEntry {
  id: string;
  stageKey: StageKey;
  raceLabel: string;
  recordedAt: number;
  previousStageResults: StageResults;
}

export type RaceHistory = RaceHistoryEntry[];

export interface PersistedEventState {
  players: ParticipantRecord[];
  waitingPlayers: ParticipantRecord[];
  rosterOrder: RosterEntry[];
  isRosterFinalized: boolean;
  stageResults: StageResults;
  raceHistory: RaceHistory;
  registrationStatus: EventRegistrationStatus;
  lockedAt: number | null;
  updatedAt: number;
}

export interface ProfileCardData {
  key: string;
  name: string;
  nickname: string;
  teamTag: string;
  metaLabel: string;
}

export interface StageStanding {
  rank: number;
  entrantIndex: number;
  totalPoints: number;
  finishCounts: [number, number, number, number];
  isTie: boolean;
  isTieBroken: boolean;
}

export interface StageRaceSlot {
  key: string;
  stageKey: StageKey;
  raceIndex: number;
  label: string;
  kind: StageRaceKind;
  participantIndexes: number[];
  result?: StageRaceResult;
  tiebreakBand?: StageTieBreakBand;
  isPending: boolean;
  isLocked: boolean;
}

export interface TournamentStage {
  key: StageKey;
  title: string;
  participantIndexes: number[];
  standings: StageStanding[];
  raceSlots: StageRaceSlot[];
  completedStandardRaceCount: number;
  completedTiebreakCount: number;
  totalStandardRaceCount: number;
  nextRace?: StageRaceSlot;
  pendingTieBreak?: StageTieBreakBand;
  winnerIndex?: number;
  isReady: boolean;
  isFinalized: boolean;
}

export type ViewMode = 'public' | 'admin';

export interface SelectionResult {
  kind: 'winner' | 'champion' | 'noop';
  championName?: string;
}

export type TournamentPlayer = ParticipantRecord;
export type LocalEventState = PersistedEventState;
export type EventRegistrationStatus = 'open' | 'nearly-full' | 'full' | 'locked';
export type BrandVariant = 'roomingkos' | 'spire';
export type BuildingKey = 'swanston' | 'dudely' | 'spire';

export interface PrizeConfig {
  tier: string;
  amount: string;
  detail: string;
  className: string;
}

export interface EventPreset {
  title: string;
  subtitle: string;
  shareText: string;
  publicViewLabel: string;
  adminViewLabel: string;
  registrationTitle: string;
  registrationFields: {
    nameLabel: string;
    namePlaceholder: string;
    nicknameLabel: string;
    nicknamePlaceholder: string;
    teamTagLabel: string;
    teamTagPlaceholder: string;
  };
  entryListTitle: string;
  countLabel: string;
  checkedInLabel: string;
  waitlistLabel: string;
  waitlistNote: string;
  summaryTitle: string;
  summaryLead: string;
  summaryDateLabel: string;
  summaryDateLong: string;
  summaryTimeLabel: string;
  summaryTimezoneLabel: string;
  summaryStatusLabel: string;
  summaryStatusDescriptions: {
    open: string;
    nearlyFull: string;
    full: string;
    locked: string;
  };
  championHeading: string;
  championAnnouncementPrefix: string;
  resultFilePrefix: string;
  resultShareTitle: string;
  resultShareText: string;
  podiumShareButtonText: string;
  matchModalKicker: string;
  thirdPlaceTitle: string;
  resultsButtonLabel: string;
  bracketHeading: string;
  entryMetaLabel: string;
  waitlistMetaLabel: string;
  slotMetaLabel: string;
  prizes: PrizeConfig[];
  eventDate: {
    monthShort: string;
    day: string;
  };
}

export interface BuildingConfig {
  key: BuildingKey;
  path: string;
  label: string;
  headline: string;
  eventId: string;
  brandVariant: BrandVariant;
}

export type BuildingMonitorConnectionState = 'loading' | 'live' | 'offline' | 'error';

export interface BuildingMonitorSnapshot {
  building: BuildingConfig;
  playersCount: number;
  waitingPlayersCount: number;
  isRosterFinalized: boolean;
  registrationStatus: EventRegistrationStatus;
  updatedAt: number | null;
  connectionState: BuildingMonitorConnectionState;
}
