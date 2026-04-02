import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  child,
  get,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
  type DataSnapshot,
  type DatabaseReference,
} from 'firebase/database';
import {
  DEFAULT_EVENT_ID,
  EVENT_ID_STORAGE_KEY,
  EVENT_STATE_STORAGE_PREFIX,
  FIREBASE_MAX_RETRIES,
  FIREBASE_RETRY_BASE_DELAY_MS,
  MAX_PLAYERS,
  THIRD_PLACE_KEY,
} from '../constants';
import { getFirebaseDatabase, isFirebaseConfigured } from '../lib/firebase';
import type {
  MatchHistory,
  MatchHistoryEntry,
  MatchScores,
  MatchWinners,
  PersistedEventState,
  PlayerRecord,
  RosterEntry,
  SelectionResult,
} from '../types';
import {
  buildPromotedParticipantState,
  buildRosterEntryForPlayer,
  clearDependentMatchScores,
  clearDependentWinners,
  computeParticipantRemovalState,
  createEmptyBracketEntrant,
  findRosterSlotIndexForPlayer,
  getBracketEntrants,
  getMatchParticipantIndexes,
  getResolvedMatchWinner,
  getThirdPlaceEntrantIndexes,
  getWinnerKey,
  pruneMatchScoresForSlot,
  pruneMatchWinnersForSlot,
  shuffleList,
} from '../utils/bracket';

interface SubmitPlayerInput {
  name: string;
  aura: string;
  unitNumber: string;
}

const MAX_MATCH_HISTORY = 24;

function copyToClipboard(value: string) {
  if (!navigator.clipboard || !window.isSecureContext) {
    return Promise.resolve(false);
  }

  return navigator.clipboard.writeText(value).then(() => true);
}

function getOrCreateEventId() {
  const params = new URLSearchParams(window.location.search);
  const queryEventId = params.get('event');

  if (queryEventId?.trim()) {
    return queryEventId.trim();
  }

  const savedEventId = localStorage.getItem(EVENT_ID_STORAGE_KEY);

  if (savedEventId && savedEventId !== DEFAULT_EVENT_ID) {
    localStorage.removeItem(`${EVENT_STATE_STORAGE_PREFIX}${savedEventId}`);
  }

  localStorage.setItem(EVENT_ID_STORAGE_KEY, DEFAULT_EVENT_ID);
  return DEFAULT_EVENT_ID;
}

function normalizeEventUrl(eventId: string) {
  const nextUrl = new URL(window.location.href);

  if (!nextUrl.searchParams.get('event') || nextUrl.searchParams.get('event') !== eventId) {
    nextUrl.searchParams.set('event', eventId);
    window.history.replaceState({}, '', nextUrl);
  }

  return nextUrl.toString();
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalizePlayerRecord(player: Partial<PlayerRecord> | null | undefined): PlayerRecord {
  const normalized: PlayerRecord = {
    name: normalizeText(player?.name),
    aura: normalizeText(player?.aura),
    unitNumber: normalizeText(player?.unitNumber),
  };

  if (typeof player?.id === 'string' && player.id) {
    normalized.id = player.id;
  }

  if (player?.createdAt !== undefined) {
    normalized.createdAt = player.createdAt;
  }

  if (player?.empty) {
    normalized.empty = true;
  }

  if (player?.isBye) {
    normalized.isBye = true;
  }

  return normalized;
}

function normalizeRosterEntry(entry: RosterEntry | null | undefined): RosterEntry {
  if (!entry || typeof entry === 'string') {
    return entry ?? null;
  }

  return normalizePlayerRecord(entry);
}

function snapshotToPlayerRecords(snapshot: DataSnapshot | null) {
  const records: PlayerRecord[] = [];

  if (!snapshot?.exists()) {
    return records;
  }

  snapshot.forEach((docItem) => {
    records.push(
      normalizePlayerRecord({
        id: docItem.key ?? undefined,
        ...(docItem.val() as Omit<PlayerRecord, 'id'>),
      }),
    );
  });

  return records;
}

function getSnapshotChildCount(snapshot: DataSnapshot | null) {
  if (!snapshot?.exists()) {
    return 0;
  }

  if (typeof snapshot.size === 'number') {
    return snapshot.size;
  }

  let childCount = 0;
  snapshot.forEach(() => {
    childCount += 1;
  });

  return childCount;
}

function isSeededTestPlayer(player: PlayerRecord | null | undefined) {
  if (!player) {
    return false;
  }

  const name = player.name || '';
  const aura = player.aura || '';

  return (
    (/^Test Player \d+$/.test(name) && aura === 'Test aura') ||
    /^Demo Player \d+$/.test(name)
  );
}

function normalizeMatchScores(matchScores: MatchScores | null | undefined): MatchScores {
  if (!matchScores || typeof matchScores !== 'object') {
    return {};
  }

  const nextMatchScores: MatchScores = {};

  Object.entries(matchScores).forEach(([key, value]) => {
    const left =
      typeof value?.left === 'number' && Number.isInteger(value.left) && value.left >= 0
        ? value.left
        : undefined;
    const right =
      typeof value?.right === 'number' && Number.isInteger(value.right) && value.right >= 0
        ? value.right
        : undefined;

    if (left === undefined || right === undefined || left === right) {
      return;
    }

    nextMatchScores[key] = { left, right };
  });

  return nextMatchScores;
}

function normalizeMatchHistory(matchHistory: MatchHistory | null | undefined): MatchHistory {
  if (!Array.isArray(matchHistory)) {
    return [];
  }

  return matchHistory
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const leftScore =
        typeof entry.leftScore === 'number' && Number.isInteger(entry.leftScore) && entry.leftScore >= 0
          ? entry.leftScore
          : undefined;
      const rightScore =
        typeof entry.rightScore === 'number' && Number.isInteger(entry.rightScore) && entry.rightScore >= 0
          ? entry.rightScore
          : undefined;

      if (
        !entry.id ||
        !entry.scoreKey ||
        !entry.title ||
        !entry.leftPlayerName ||
        !entry.rightPlayerName ||
        !entry.winnerName ||
        leftScore === undefined ||
        rightScore === undefined ||
        leftScore === rightScore
      ) {
        return null;
      }

      return {
        id: String(entry.id),
        scoreKey: String(entry.scoreKey),
        title: String(entry.title),
        leftPlayerName: String(entry.leftPlayerName),
        rightPlayerName: String(entry.rightPlayerName),
        leftScore,
        rightScore,
        winnerName: String(entry.winnerName),
        recordedAt:
          typeof entry.recordedAt === 'number' && Number.isFinite(entry.recordedAt)
            ? entry.recordedAt
            : Date.now(),
        previousMatchWinners:
          entry.previousMatchWinners && typeof entry.previousMatchWinners === 'object'
            ? entry.previousMatchWinners
            : {},
        previousMatchScores: normalizeMatchScores(entry.previousMatchScores),
      } satisfies MatchHistoryEntry;
    })
    .filter((entry): entry is MatchHistoryEntry => entry !== null)
    .slice(-MAX_MATCH_HISTORY);
}

function getMatchTitle(matchLevel: number) {
  if (matchLevel === 1) {
    return 'Round 1';
  }

  if (matchLevel === 2) {
    return 'Quarterfinal';
  }

  if (matchLevel === 3) {
    return 'Semifinal';
  }

  if (matchLevel === 4) {
    return 'Final';
  }

  return 'Match';
}

function sanitizePersistedState(state: PersistedEventState): PersistedEventState {
  const nextPlayers = state.players
    .map((player) => normalizePlayerRecord(player))
    .filter((player) => !isSeededTestPlayer(player));
  const nextWaitingPlayers = state.waitingPlayers
    .map((player) => normalizePlayerRecord(player))
    .filter((player) => !isSeededTestPlayer(player));
  const nextRosterOrder = state.rosterOrder.map((entry) => normalizeRosterEntry(entry));
  const nextMatchScores = normalizeMatchScores(state.matchScores);
  const nextMatchHistory = normalizeMatchHistory(state.matchHistory);

  if (
    nextPlayers.length === state.players.length &&
    nextWaitingPlayers.length === state.waitingPlayers.length &&
    nextRosterOrder.length === state.rosterOrder.length
  ) {
    return {
      ...state,
      players: nextPlayers,
      waitingPlayers: nextWaitingPlayers,
      rosterOrder: nextRosterOrder,
      matchScores: nextMatchScores,
      matchHistory: nextMatchHistory,
    };
  }

  return {
    ...state,
    players: nextPlayers,
    waitingPlayers: nextWaitingPlayers,
    rosterOrder: nextRosterOrder,
    isRosterFinalized: false,
    matchWinners: {},
    matchScores: {},
    matchHistory: [],
  };
}

function shouldQueueNewSignup(isRosterFinalized: boolean, playerCount: number) {
  return isRosterFinalized || playerCount >= MAX_PLAYERS;
}

async function ensureEventDocument(eventRef: DatabaseReference) {
  const snapshot = await get(eventRef);

  if (snapshot.exists()) {
    return;
  }

  await set(eventRef, {
    title: 'Swanston Table Tennis Tournament',
    maxPlayers: MAX_PLAYERS,
    isRosterFinalized: false,
    rosterOrder: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function purgeSeededTestDataRemotelyIfNeeded(
  eventRef: DatabaseReference,
  participantsRef: DatabaseReference,
  waitlistRef: DatabaseReference,
) {
  const [participantsSnapshot, waitlistSnapshot] = await Promise.all([
    get(participantsRef),
    get(waitlistRef),
  ]);

  const participantRecords = snapshotToPlayerRecords(participantsSnapshot);
  const waitlistRecords = snapshotToPlayerRecords(waitlistSnapshot);
  const hasLegacyData = participantRecords.length > 0 || waitlistRecords.length > 0;

  if (!hasLegacyData) {
    return;
  }

  const participantsAreSeededOnly = participantRecords.every((player) => isSeededTestPlayer(player));
  const waitlistAreSeededOnly = waitlistRecords.every((player) => isSeededTestPlayer(player));

  if (!participantsAreSeededOnly || !waitlistAreSeededOnly) {
    return;
  }

  await update(eventRef, {
    participants: null,
    waitlist: null,
    rosterOrder: null,
    isRosterFinalized: false,
    matchWinners: null,
    matchScores: null,
    matchHistory: null,
    updatedAt: serverTimestamp(),
  });
}

export function useTournamentEvent() {
  const [eventId] = useState(getOrCreateEventId);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [waitingPlayers, setWaitingPlayers] = useState<PlayerRecord[]>([]);
  const [rosterOrder, setRosterOrder] = useState<RosterEntry[]>([]);
  const [isRosterFinalized, setIsRosterFinalized] = useState(false);
  const [matchWinners, setMatchWinners] = useState<MatchWinners>({});
  const [matchScores, setMatchScores] = useState<MatchScores>({});
  const [matchHistory, setMatchHistory] = useState<MatchHistory>([]);
  const [isFirebaseAvailable, setIsFirebaseAvailable] = useState(true);
  const [shareStatus, setShareStatus] = useState('');
  const [isShufflingRoster, setIsShufflingRoster] = useState(false);

  const participantsRef = useRef<DatabaseReference | null>(null);
  const waitlistRef = useRef<DatabaseReference | null>(null);
  const eventRef = useRef<DatabaseReference | null>(null);
  const didRestoreLocalState = useRef(false);
  const retryTimeoutRef = useRef<number | null>(null);
  const shuffleTimeoutRef = useRef<number | null>(null);
  const firebaseRetryCountRef = useRef(0);

  useEffect(() => {
    normalizeEventUrl(eventId);

    const rawState = localStorage.getItem(`${EVENT_STATE_STORAGE_PREFIX}${eventId}`);
    if (!rawState) {
      didRestoreLocalState.current = true;
      return;
    }

    try {
      const parsedState = JSON.parse(rawState) as PersistedEventState;
      const state = sanitizePersistedState(parsedState);

      setPlayers(Array.isArray(state.players) ? state.players : []);
      setWaitingPlayers(Array.isArray(state.waitingPlayers) ? state.waitingPlayers : []);
      setRosterOrder(Array.isArray(state.rosterOrder) ? state.rosterOrder : []);
      setIsRosterFinalized(Boolean(state.isRosterFinalized));
      setMatchWinners(
        state.matchWinners && typeof state.matchWinners === 'object'
          ? state.matchWinners
          : {},
      );
      setMatchScores(normalizeMatchScores(state.matchScores));
      setMatchHistory(normalizeMatchHistory(state.matchHistory));
    } catch (error) {
      console.error(error);
    } finally {
      didRestoreLocalState.current = true;
    }
  }, [eventId]);

  useEffect(() => {
    if (!didRestoreLocalState.current) {
      return;
    }

    const persistedState: PersistedEventState = {
      players,
      waitingPlayers,
      rosterOrder,
      isRosterFinalized,
      matchWinners,
      matchScores,
      matchHistory,
      updatedAt: Date.now(),
    };

    localStorage.setItem(
      `${EVENT_STATE_STORAGE_PREFIX}${eventId}`,
      JSON.stringify(persistedState),
    );
  }, [eventId, isRosterFinalized, matchHistory, matchScores, matchWinners, players, rosterOrder, waitingPlayers]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsFirebaseAvailable(false);
      setShareStatus('Firebase is not configured. Running in local-only mode.');
      return;
    }

    let isActive = true;
    const unsubscribers: Array<() => void> = [];

    const connect = async () => {
      try {
        const db = getFirebaseDatabase();
        participantsRef.current = ref(db, `events/${eventId}/participants`);
        waitlistRef.current = ref(db, `events/${eventId}/waitlist`);
        eventRef.current = ref(db, `events/${eventId}`);

        if (!participantsRef.current || !waitlistRef.current || !eventRef.current) {
          return;
        }

        await ensureEventDocument(eventRef.current);
        await purgeSeededTestDataRemotelyIfNeeded(
          eventRef.current,
          participantsRef.current,
          waitlistRef.current,
        );

        if (!isActive) {
          return;
        }

        setIsFirebaseAvailable(true);
        setShareStatus('Live sync enabled. Share this page to collect registrations.');
        firebaseRetryCountRef.current = 0;

        unsubscribers.push(
          onValue(
            query(participantsRef.current, orderByChild('createdAt')),
            (snapshot) => {
              if (!isActive) {
                return;
              }

              setPlayers(snapshotToPlayerRecords(snapshot));
            },
            (error) => {
              console.error('[RK Events] Participants listener error:', error);
              setShareStatus('Realtime sync error. Refreshing list from local input.');
            },
          ),
        );

        unsubscribers.push(
          onValue(
            query(waitlistRef.current, orderByChild('createdAt')),
            (snapshot) => {
              if (!isActive) {
                return;
              }

              setWaitingPlayers(snapshotToPlayerRecords(snapshot));
            },
            (error) => {
              console.error('[RK Events] Waitlist listener error:', error);
              setShareStatus('Realtime waitlist sync error. Refreshing list from local input.');
            },
          ),
        );

        unsubscribers.push(
          onValue(
            eventRef.current,
            (snapshot) => {
              if (!isActive || !snapshot.exists()) {
                return;
              }

              const data = snapshot.val() as {
                rosterOrder?: RosterEntry[];
                isRosterFinalized?: boolean;
                matchWinners?: MatchWinners;
                matchScores?: MatchScores;
                matchHistory?: MatchHistory;
              };

              setRosterOrder(
                Array.isArray(data?.rosterOrder)
                  ? data.rosterOrder.map((entry) => normalizeRosterEntry(entry))
                  : [],
              );
              setIsRosterFinalized(Boolean(data?.isRosterFinalized));
              setMatchWinners(
                data?.matchWinners && typeof data.matchWinners === 'object'
                  ? data.matchWinners
                  : {},
              );
              setMatchScores(normalizeMatchScores(data?.matchScores));
              setMatchHistory(normalizeMatchHistory(data?.matchHistory));
            },
            (error) => {
              console.error('[RK Events] Event listener error:', error);
              setShareStatus('Failed to sync bracket state.');
            },
          ),
        );
      } catch (error) {
        console.error('[RK Events] Firebase initialization error:', error);

        if (!isActive) {
          return;
        }

        setIsFirebaseAvailable(false);

        if (firebaseRetryCountRef.current >= FIREBASE_MAX_RETRIES) {
          setShareStatus('Firebase unavailable. Refresh to try again.');
          return;
        }

        setShareStatus('Unable to connect to Firebase. Retrying...');
        firebaseRetryCountRef.current += 1;
        const retryDelay =
          FIREBASE_RETRY_BASE_DELAY_MS * Math.pow(2, firebaseRetryCountRef.current - 1);

        retryTimeoutRef.current = window.setTimeout(connect, retryDelay);
      }
    };

    void connect();

    return () => {
      isActive = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());

      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [eventId]);

  useEffect(() => {
    return () => {
      if (shuffleTimeoutRef.current) {
        window.clearTimeout(shuffleTimeoutRef.current);
      }
    };
  }, []);

  const submitParticipant = useCallback(
    async ({ name, aura, unitNumber }: SubmitPlayerInput) => {
      if (isShufflingRoster) {
        return false;
      }

      const player = {
        name: name.trim(),
        aura: aura.trim(),
        unitNumber: unitNumber.trim(),
      };

      if (!player.name || !player.aura || !player.unitNumber) {
        return false;
      }

      const shouldQueue = shouldQueueNewSignup(isRosterFinalized, players.length);

      if (!isFirebaseAvailable || !participantsRef.current) {
        if (shouldQueue) {
          setWaitingPlayers((current) => [...current, player]);
        } else {
          setPlayers((current) => [...current, player]);
        }

        return true;
      }

      let addToWaitlist = shouldQueue;

      if (!addToWaitlist) {
        try {
          const snapshot = await get(participantsRef.current);
          addToWaitlist = getSnapshotChildCount(snapshot) >= MAX_PLAYERS;
        } catch (error) {
          console.error('[RK Events] Failed to inspect participant count before signup:', error);
          addToWaitlist = players.length >= MAX_PLAYERS;
        }
      }

      const targetRef = addToWaitlist ? waitlistRef.current : participantsRef.current;

      if (!targetRef) {
        return false;
      }

      try {
        await set(push(targetRef), {
          ...player,
          createdAt: serverTimestamp(),
        });
        return true;
      } catch (error) {
        console.error(error);
        setShareStatus('Unable to save participant. Please verify your Firebase permissions.');
        return false;
      }
    },
    [isFirebaseAvailable, isRosterFinalized, isShufflingRoster, players.length],
  );

  const shareEvent = useCallback(async () => {
    const eventUrl = normalizeEventUrl(eventId);
    const shareData = {
      title: 'Swanston Table Tennis Tournament',
      text: 'Reserve your spot for the 16-player knockout bracket at RoomingKos Swanston.',
      url: eventUrl,
    };

    setShareStatus('Preparing share link...');

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus('Share successful.');
        return;
      }

      const copied = await copyToClipboard(eventUrl);
      setShareStatus(copied ? 'Link copied to clipboard.' : `Share link: ${eventUrl}`);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setShareStatus('');
        return;
      }

      const copied = await copyToClipboard(eventUrl);

      if (copied) {
        setShareStatus('Link copied to clipboard.');
      } else if (error instanceof Error && error.name === 'NotAllowedError') {
        setShareStatus('Please allow clipboard permission and try again.');
      } else {
        setShareStatus('Unable to share automatically. Copy the URL from your browser bar.');
      }
    }
  }, [eventId]);

  const drawRoster = useCallback(() => {
    if (isShufflingRoster || players.length < 2) {
      return;
    }

    if (shuffleTimeoutRef.current) {
      window.clearTimeout(shuffleTimeoutRef.current);
    }

    setIsShufflingRoster(true);
    const finalizedIds = shuffleList(players).map((player) => player.id || player);

    shuffleTimeoutRef.current = window.setTimeout(() => {
      setRosterOrder(finalizedIds);
      setIsRosterFinalized(true);
      setMatchWinners({});
      setMatchScores({});
      setMatchHistory([]);
      setIsShufflingRoster(false);

      if (isFirebaseAvailable && eventRef.current) {
        void update(eventRef.current, {
          isRosterFinalized: true,
          rosterOrder: finalizedIds,
          matchWinners: {},
          matchScores: {},
          matchHistory: [],
          maxPlayers: MAX_PLAYERS,
          updatedAt: serverTimestamp(),
        }).catch((error) => {
          console.error(error);
          setShareStatus('Failed to lock roster. Please try again.');
        });
      }
    }, 1600);
  }, [isFirebaseAvailable, isShufflingRoster, players]);

  const deleteParticipant = useCallback(
    async (index: number) => {
      if (index < 0 || index >= players.length) {
        return;
      }

      const player = players[index];
      const waitingPlayer = waitingPlayers[0] || null;
      const bracketSlotIndex =
        isRosterFinalized && rosterOrder.length
          ? findRosterSlotIndexForPlayer(player, rosterOrder)
          : -1;
      const shouldClearMatchHistory = bracketSlotIndex !== -1;

      if (!isFirebaseAvailable || !participantsRef.current || !eventRef.current || !player.id) {
        const promotedPlayer = buildPromotedParticipantState(waitingPlayer, player);
        const nextState = computeParticipantRemovalState({
          players,
          waitingPlayers,
          rosterOrder,
          isRosterFinalized,
          matchWinners,
          matchScores,
          removedPlayer: player,
          replacementPlayer: promotedPlayer,
          preferredIndex: index,
        });

        setPlayers(nextState.players);
        setWaitingPlayers(nextState.waitingPlayers);
        setRosterOrder(nextState.rosterOrder);
        setMatchWinners(nextState.matchWinners);
        setMatchScores(nextState.matchScores);
        if (shouldClearMatchHistory) {
          setMatchHistory([]);
        }
        return;
      }

      try {
        const updates: Record<string, unknown> = {
          [`participants/${player.id}`]: null,
          updatedAt: serverTimestamp(),
        };

        let promotedPlayer: PlayerRecord | null = null;

        if (waitingPlayer?.id) {
          promotedPlayer = buildPromotedParticipantState(waitingPlayer, player, waitingPlayer.id);

          if (promotedPlayer) {
            const { id: promotedId, ...payload } = promotedPlayer;
            updates[`participants/${promotedId}`] = payload;
            updates[`waitlist/${waitingPlayer.id}`] = null;
          }
        }

        if (isRosterFinalized && rosterOrder.length) {
          const slotIndex = bracketSlotIndex;

          if (slotIndex !== -1) {
            const nextOrder = [...rosterOrder];
            nextOrder[slotIndex] = promotedPlayer
              ? buildRosterEntryForPlayer(promotedPlayer, nextOrder)
              : null;

            updates.rosterOrder = nextOrder;
            updates.matchWinners = pruneMatchWinnersForSlot(slotIndex, matchWinners);
            updates.matchScores = pruneMatchScoresForSlot(slotIndex, matchScores);
            updates.matchHistory = [];
          }
        }

        await update(eventRef.current, updates);

        const nextState = computeParticipantRemovalState({
          players,
          waitingPlayers,
          rosterOrder,
          isRosterFinalized,
          matchWinners,
          matchScores,
          removedPlayer: player,
          replacementPlayer: promotedPlayer,
          preferredIndex: index,
        });

        setPlayers(nextState.players);
        setWaitingPlayers(nextState.waitingPlayers);
        setRosterOrder(nextState.rosterOrder);
        setMatchWinners(nextState.matchWinners);
        setMatchScores(nextState.matchScores);
        if (shouldClearMatchHistory) {
          setMatchHistory([]);
        }
      } catch (error) {
        console.error(error);
        setShareStatus('Unable to delete participant. Please verify your Firebase permissions.');
      }
    },
    [isFirebaseAvailable, isRosterFinalized, matchScores, matchWinners, players, rosterOrder, waitingPlayers],
  );

  const deleteWaitingParticipant = useCallback(
    async (index: number) => {
      if (index < 0 || index >= waitingPlayers.length) {
        return;
      }

      const player = waitingPlayers[index];

      if (!isFirebaseAvailable || !waitlistRef.current || !player.id) {
        setWaitingPlayers((current) => current.filter((_, currentIndex) => currentIndex !== index));
        return;
      }

      try {
        await remove(child(waitlistRef.current, player.id));
      } catch (error) {
        console.error(error);
        setShareStatus('Unable to delete waitlist participant. Please verify your Firebase permissions.');
      }
    },
    [isFirebaseAvailable, waitingPlayers],
  );

  const resetEvent = useCallback(async () => {
    setRosterOrder([]);
    setIsRosterFinalized(false);
    setMatchWinners({});
    setMatchScores({});
    setMatchHistory([]);
    setIsShufflingRoster(false);

    if (!isFirebaseAvailable || !eventRef.current) {
      return;
    }

    try {
      await update(eventRef.current, {
        rosterOrder: [],
        isRosterFinalized: false,
        matchWinners: {},
        matchScores: {},
        matchHistory: [],
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(error);
      setShareStatus('Failed to reset tournament data.');
    }
  }, [isFirebaseAvailable]);

  const submitMatchScore = useCallback(
    (
      matchLevel: number,
      matchIndex: number,
      leftScore: number,
      rightScore: number,
    ): SelectionResult => {
      if (!isRosterFinalized) {
        return { kind: 'noop' };
      }

      if (
        matchLevel < 1 ||
        matchLevel > 4 ||
        !Number.isInteger(leftScore) ||
        !Number.isInteger(rightScore) ||
        leftScore < 0 ||
        rightScore < 0 ||
        leftScore === rightScore
      ) {
        return { kind: 'noop' };
      }

      const entrants = getBracketEntrants(players, rosterOrder, isRosterFinalized);
      while (entrants.length < MAX_PLAYERS) {
        entrants.push(createEmptyBracketEntrant());
      }

      const participantIndexes = getMatchParticipantIndexes(
        matchLevel,
        matchIndex,
        entrants,
        matchWinners,
      );

      if (participantIndexes.length !== 2) {
        return { kind: 'noop' };
      }

      const leftPlayer = entrants[participantIndexes[0]];
      const rightPlayer = entrants[participantIndexes[1]];

      if (!leftPlayer || !rightPlayer || leftPlayer.empty || rightPlayer.empty) {
        return { kind: 'noop' };
      }

      const winnerEntrantIndex = participantIndexes[leftScore > rightScore ? 0 : 1];
      const key = getWinnerKey(matchLevel, matchIndex);
      const previousWinner = matchWinners[key];
      const previousScore = matchScores[key];

      if (
        previousWinner === winnerEntrantIndex &&
        previousScore?.left === leftScore &&
        previousScore?.right === rightScore
      ) {
        return { kind: 'noop' };
      }

      let nextWinners = { ...matchWinners };
      let nextMatchScores = { ...matchScores };
      const winnerName =
        winnerEntrantIndex === participantIndexes[0] ? leftPlayer.name : rightPlayer.name;

      if (previousWinner !== undefined && previousWinner !== winnerEntrantIndex) {
        const nextLevel = matchLevel + 1;
        const nextMatchIndex = Math.floor(matchIndex / 2);

        if (nextLevel <= 4) {
          nextWinners = clearDependentWinners(nextWinners, nextLevel, nextMatchIndex);
          nextMatchScores = clearDependentMatchScores(nextMatchScores, nextLevel, nextMatchIndex);
        }
      }

      nextWinners[key] = winnerEntrantIndex;
      nextMatchScores[key] = { left: leftScore, right: rightScore };

      const nextMatchHistory = [
        ...matchHistory,
        {
          id: `${Date.now()}-${key}`,
          scoreKey: key,
          title: getMatchTitle(matchLevel),
          leftPlayerName: leftPlayer.name,
          rightPlayerName: rightPlayer.name,
          leftScore,
          rightScore,
          winnerName,
          recordedAt: Date.now(),
          previousMatchWinners: { ...matchWinners },
          previousMatchScores: { ...matchScores },
        },
      ].slice(-MAX_MATCH_HISTORY);

      if (matchLevel === 3 && previousWinner !== undefined && previousWinner !== winnerEntrantIndex) {
        delete nextWinners[THIRD_PLACE_KEY];
        delete nextMatchScores[THIRD_PLACE_KEY];
      }

      setMatchWinners(nextWinners);
      setMatchScores(nextMatchScores);
      setMatchHistory(nextMatchHistory);

      if (isFirebaseAvailable && eventRef.current) {
        void update(eventRef.current, {
          matchWinners: nextWinners,
          matchScores: nextMatchScores,
          matchHistory: nextMatchHistory,
          updatedAt: serverTimestamp(),
        }).catch((error) => {
          console.error(error);
          setShareStatus('Failed to sync bracket state.');
        });
      }

      if (matchLevel !== 4) {
        return { kind: 'winner' };
      }

      const champion = entrants[winnerEntrantIndex];

      return {
        kind: 'champion',
        championName: champion && !champion.empty ? champion.name : 'Champion',
      };
    },
    [isFirebaseAvailable, isRosterFinalized, matchHistory, matchScores, matchWinners, players, rosterOrder],
  );

  const submitThirdPlaceScore = useCallback(
    (leftScore: number, rightScore: number): SelectionResult => {
      if (!isRosterFinalized) {
        return { kind: 'noop' };
      }

      if (
        !Number.isInteger(leftScore) ||
        !Number.isInteger(rightScore) ||
        leftScore < 0 ||
        rightScore < 0 ||
        leftScore === rightScore
      ) {
        return { kind: 'noop' };
      }

      const entrants = getBracketEntrants(players, rosterOrder, isRosterFinalized);
      while (entrants.length < MAX_PLAYERS) {
        entrants.push(createEmptyBracketEntrant());
      }

      const thirdPlaceEntrants = getThirdPlaceEntrantIndexes(entrants, matchWinners);
      const playoffReady = thirdPlaceEntrants.every((entrantIndex) => entrantIndex !== undefined);

      if (!playoffReady || thirdPlaceEntrants[0] === undefined || thirdPlaceEntrants[1] === undefined) {
        return { kind: 'noop' };
      }

      const winnerEntrantIndex = leftScore > rightScore ? thirdPlaceEntrants[0] : thirdPlaceEntrants[1];
      const previousScore = matchScores[THIRD_PLACE_KEY];

      if (
        matchWinners[THIRD_PLACE_KEY] === winnerEntrantIndex &&
        previousScore?.left === leftScore &&
        previousScore?.right === rightScore
      ) {
        return { kind: 'noop' };
      }

      const nextWinners = {
        ...matchWinners,
        [THIRD_PLACE_KEY]: winnerEntrantIndex,
      };
      const nextMatchScores = {
        ...matchScores,
        [THIRD_PLACE_KEY]: { left: leftScore, right: rightScore },
      };
      const nextMatchHistory = [
        ...matchHistory,
        {
          id: `${Date.now()}-${THIRD_PLACE_KEY}`,
          scoreKey: THIRD_PLACE_KEY,
          title: '3rd Place Playoff',
          leftPlayerName: entrants[thirdPlaceEntrants[0]].name,
          rightPlayerName: entrants[thirdPlaceEntrants[1]].name,
          leftScore,
          rightScore,
          winnerName: entrants[winnerEntrantIndex].name,
          recordedAt: Date.now(),
          previousMatchWinners: { ...matchWinners },
          previousMatchScores: { ...matchScores },
        },
      ].slice(-MAX_MATCH_HISTORY);

      setMatchWinners(nextWinners);
      setMatchScores(nextMatchScores);
      setMatchHistory(nextMatchHistory);

      if (isFirebaseAvailable && eventRef.current) {
        void update(eventRef.current, {
          matchWinners: nextWinners,
          matchScores: nextMatchScores,
          matchHistory: nextMatchHistory,
          updatedAt: serverTimestamp(),
        }).catch((error) => {
          console.error(error);
          setShareStatus('Failed to sync bracket state.');
        });
      }

      return { kind: 'winner' };
    },
    [isFirebaseAvailable, isRosterFinalized, matchHistory, matchScores, matchWinners, players, rosterOrder],
  );

  const undoLastMatchResult = useCallback(() => {
    if (!isRosterFinalized || matchHistory.length === 0) {
      return false;
    }

    const previousEntry = matchHistory[matchHistory.length - 1];
    const nextMatchHistory = matchHistory.slice(0, -1);

    setMatchWinners(previousEntry.previousMatchWinners);
    setMatchScores(previousEntry.previousMatchScores);
    setMatchHistory(nextMatchHistory);

    if (isFirebaseAvailable && eventRef.current) {
      void update(eventRef.current, {
        matchWinners: previousEntry.previousMatchWinners,
        matchScores: previousEntry.previousMatchScores,
        matchHistory: nextMatchHistory,
        updatedAt: serverTimestamp(),
      }).catch((error) => {
        console.error(error);
        setShareStatus('Failed to undo the last result.');
      });
    }

    return true;
  }, [isFirebaseAvailable, isRosterFinalized, matchHistory]);

  const isRosterFull = useMemo(() => players.length >= MAX_PLAYERS, [players.length]);
  const shouldQueueSignup = useMemo(
    () => shouldQueueNewSignup(isRosterFinalized, players.length),
    [isRosterFinalized, players.length],
  );

  const championIndex = useMemo(() => {
    const entrants = getBracketEntrants(players, rosterOrder, isRosterFinalized);
    return getResolvedMatchWinner(4, 0, entrants, matchWinners);
  }, [isRosterFinalized, matchWinners, players, rosterOrder]);

  return {
    eventId,
    players,
    waitingPlayers,
    rosterOrder,
    isRosterFinalized,
    matchWinners,
    matchScores,
    matchHistory,
    isFirebaseAvailable,
    isShufflingRoster,
    isRosterFull,
    shouldQueueSignup,
    shareStatus,
    championIndex,
    setShareStatus,
    submitParticipant,
    shareEvent,
    drawRoster,
    deleteParticipant,
    deleteWaitingParticipant,
    resetEvent,
    submitMatchScore,
    submitThirdPlaceScore,
    undoLastMatchResult,
  };
}
