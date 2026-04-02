export interface PlayerRecord {
  id?: string;
  name: string;
  aura: string;
  unitNumber: string;
  createdAt?: unknown;
  empty?: boolean;
  isBye?: boolean;
}

export type RosterEntry = string | PlayerRecord | null;

export type MatchWinners = Record<string, number>;

export interface MatchScore {
  left: number;
  right: number;
}

export type MatchScores = Record<string, MatchScore>;

export interface MatchHistoryEntry {
  id: string;
  scoreKey: string;
  title: string;
  leftPlayerName: string;
  rightPlayerName: string;
  leftScore: number;
  rightScore: number;
  winnerName: string;
  recordedAt: number;
  previousMatchWinners: MatchWinners;
  previousMatchScores: MatchScores;
}

export type MatchHistory = MatchHistoryEntry[];

export interface PersistedEventState {
  players: PlayerRecord[];
  waitingPlayers: PlayerRecord[];
  rosterOrder: RosterEntry[];
  isRosterFinalized: boolean;
  matchWinners: MatchWinners;
  matchScores: MatchScores;
  matchHistory: MatchHistory;
  updatedAt: number;
}

export interface ProfileCardData {
  key: string;
  name: string;
  aura: string;
  unitNumber: string;
  metaLabel: string;
}

export interface BracketResolution {
  state: 'empty' | 'pending' | 'resolved';
  participantIndexes: number[];
  winnerIndex?: number;
  decidedBy?: 'manual' | 'bye';
}

export type ViewMode = 'warriors' | 'admin';

export interface SelectionResult {
  kind: 'winner' | 'champion' | 'noop';
  championName?: string;
}

export type TournamentPlayer = PlayerRecord;
export type LocalEventState = PersistedEventState;
