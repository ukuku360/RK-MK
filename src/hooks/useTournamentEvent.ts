import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onValue,
  orderByChild,
  query,
  ref,
  serverTimestamp,
  update,
  type DatabaseReference,
} from 'firebase/database';
import {
  EVENT_REGISTRATION_ENDPOINT,
  FIREBASE_MAX_RETRIES,
  FIREBASE_RETRY_BASE_DELAY_MS,
  MAX_PLAYERS,
} from '../constants';
import {
  hasLocalDevelopmentAdminSession,
  isLocalDevelopmentMode,
  LOCAL_DEV_ADMIN_UID,
} from '../lib/adminAccess';
import { getFirebaseAuth, getFirebaseDatabase, isFirebaseConfigured } from '../lib/firebase';
import type {
  BrandVariant,
  EventPreset,
  EventRegistrationStatus,
  PersistedEventState,
  PlayerRecord,
  RaceHistory,
  RosterEntry,
  SelectionResult,
  StageRaceSlot,
  StageResults,
} from '../types';
import {
  buildPromotedParticipantState,
  buildRosterEntryForPlayer,
  buildTournamentStages,
  cloneStageResults,
  createEmptyStageResults,
  findRosterSlotIndexForPlayer,
  getBracketEntrants,
  padEntrantsToGrid,
  shuffleList,
} from '../utils/bracket';
import {
  applyParticipantRegistration,
  getEventRegistrationStatus,
  normalizeRegistrationInput,
} from '../utils/registration';
import { ensureEventDocument, purgeSeededTestDataRemotelyIfNeeded } from './tournament/firebase';
import {
  loadPersistedEventState,
  MAX_RACE_HISTORY,
  normalizeRaceHistory,
  normalizeRosterEntry,
  normalizeStageResults,
  persistEventState,
  snapshotToPlayerRecords,
} from './tournament/state';

interface SubmitPlayerInput {
  name: string;
  nickname: string;
  teamTag: string;
}

function createLocalDevSeedPlayers() {
  return Array.from({ length: MAX_PLAYERS }, (_, index) => {
    const playerNumber = index + 1;

    return {
      id: `seed-spire-${playerNumber}`,
      name: `Demo Player ${playerNumber}`,
      nickname: `Test tag ${playerNumber}`,
      teamTag: 'Spire',
      createdAt: Date.now() + index,
      updatedAt: Date.now() + index,
      lastUpdatedBy: 'local-dev-seed',
      checkedIn: false,
    } satisfies PlayerRecord;
  });
}

function copyToClipboard(value: string) {
  if (!navigator.clipboard || !window.isSecureContext) {
    return Promise.resolve(false);
  }

  return navigator.clipboard.writeText(value).then(() => true);
}

function isSameFinishingOrder(
  left: number[] | undefined,
  right: number[],
) {
  if (!left || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function useTournamentEvent(
  eventId: string,
  preset: EventPreset,
  brandVariant: BrandVariant = 'roomingkos',
) {
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [waitingPlayers, setWaitingPlayers] = useState<PlayerRecord[]>([]);
  const [rosterOrder, setRosterOrder] = useState<RosterEntry[]>([]);
  const [isRosterFinalized, setIsRosterFinalized] = useState(false);
  const [lockedAt, setLockedAt] = useState<number | null>(null);
  const [stageResults, setStageResults] = useState<StageResults>(createEmptyStageResults());
  const [raceHistory, setRaceHistory] = useState<RaceHistory>([]);
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
  const registrationStatus = useMemo<EventRegistrationStatus>(
    () => getEventRegistrationStatus(players.length, MAX_PLAYERS, isRosterFinalized),
    [isRosterFinalized, players.length],
  );
  const getCurrentActorId = useCallback(() => {
    if (hasLocalDevelopmentAdminSession()) {
      return LOCAL_DEV_ADMIN_UID;
    }

    if (!isFirebaseConfigured()) {
      return 'race-control';
    }

    return getFirebaseAuth().currentUser?.uid ?? 'race-control';
  }, []);

  useEffect(() => {
    didRestoreLocalState.current = false;
    const state = loadPersistedEventState(eventId);

    if (!state) {
      setPlayers([]);
      setWaitingPlayers([]);
      setRosterOrder([]);
      setIsRosterFinalized(false);
      setLockedAt(null);
      setStageResults(createEmptyStageResults());
      setRaceHistory([]);
      didRestoreLocalState.current = true;
      return;
    }

    setPlayers(Array.isArray(state.players) ? state.players : []);
    setWaitingPlayers(Array.isArray(state.waitingPlayers) ? state.waitingPlayers : []);
    setRosterOrder(Array.isArray(state.rosterOrder) ? state.rosterOrder : []);
    setIsRosterFinalized(Boolean(state.isRosterFinalized));
    setLockedAt(typeof state.lockedAt === 'number' ? state.lockedAt : null);
    setStageResults(normalizeStageResults(state.stageResults));
    setRaceHistory(normalizeRaceHistory(state.raceHistory));
    didRestoreLocalState.current = true;
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
      stageResults,
      raceHistory,
      registrationStatus,
      lockedAt,
      updatedAt: Date.now(),
    };

    persistEventState(eventId, persistedState);
  }, [
    eventId,
    isRosterFinalized,
    lockedAt,
    players,
    raceHistory,
    registrationStatus,
    rosterOrder,
    stageResults,
    waitingPlayers,
  ]);

  useEffect(() => {
    if (!isLocalDevelopmentMode()) {
      return;
    }

    if (brandVariant !== 'spire') {
      return;
    }

    if (!didRestoreLocalState.current || isRosterFinalized || players.length > 0 || waitingPlayers.length > 0) {
      return;
    }

    setPlayers(createLocalDevSeedPlayers());
    setWaitingPlayers([]);
    setShareStatus('Local Spire preview seeded with 16 demo drivers.');
  }, [brandVariant, eventId, isRosterFinalized, players.length, waitingPlayers.length]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsFirebaseAvailable(false);
      setShareStatus(
        isLocalDevelopmentMode()
          ? 'Local development mode enabled. Registrations and admin changes stay in this browser.'
          : 'Firebase is not configured. Running in local-only mode.',
      );
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

        await ensureEventDocument(eventRef.current, preset.title);
        await purgeSeededTestDataRemotelyIfNeeded(
          eventRef.current,
          participantsRef.current,
          waitlistRef.current,
        );

        if (!isActive) {
          return;
        }

        setIsFirebaseAvailable(true);
        setShareStatus('Live sync enabled. Share this page to collect driver registrations.');
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
              setShareStatus('Realtime pit lane sync error. Refreshing from local input.');
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
                lockedAt?: number | null;
                stageResults?: unknown;
                raceHistory?: unknown;
              };

              setRosterOrder(
                Array.isArray(data?.rosterOrder)
                  ? data.rosterOrder.map((entry) => normalizeRosterEntry(entry))
                  : [],
              );
              setIsRosterFinalized(Boolean(data?.isRosterFinalized));
              setLockedAt(typeof data?.lockedAt === 'number' ? data.lockedAt : null);
              setStageResults(normalizeStageResults(data?.stageResults));
              setRaceHistory(normalizeRaceHistory(data?.raceHistory));
            },
            (error) => {
              console.error('[RK Events] Event listener error:', error);
              setShareStatus('Failed to sync stage state.');
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
  }, [eventId, preset.title]);

  useEffect(() => {
    return () => {
      if (shuffleTimeoutRef.current) {
        window.clearTimeout(shuffleTimeoutRef.current);
      }
    };
  }, []);

  const orderedEntrants = useMemo(
    () => padEntrantsToGrid(getBracketEntrants(players, rosterOrder, isRosterFinalized)),
    [isRosterFinalized, players, rosterOrder],
  );

  const {
    groupStages,
    finalStage,
    podium: podiumIndexes,
    completedStandardRaceCount,
    totalStandardRaceCount,
    completedTieBreakCount,
  } = useMemo(
    () => buildTournamentStages(orderedEntrants, stageResults, isRosterFinalized),
    [isRosterFinalized, orderedEntrants, stageResults],
  );

  const podium = useMemo(
    () =>
      podiumIndexes.map((entrantIndex) =>
        entrantIndex !== undefined ? orderedEntrants[entrantIndex] : undefined,
      ),
    [orderedEntrants, podiumIndexes],
  );
  const resultsReady = useMemo(
    () => finalStage.isFinalized && podium[0] !== undefined,
    [finalStage.isFinalized, podium],
  );
  const currentChampionName = podium[0]?.empty ? undefined : podium[0]?.name;

  const submitParticipant = useCallback(
    async ({ name, nickname, teamTag }: SubmitPlayerInput) => {
      if (isShufflingRoster) {
        return false;
      }

      const player = normalizeRegistrationInput({
        name,
        nickname,
        teamTag,
      });

      if (!player.name) {
        return false;
      }

      if (!isFirebaseAvailable || !eventRef.current) {
        const localResult = applyParticipantRegistration({
          players,
          waitingPlayers,
          input: player,
          maxPlayers: MAX_PLAYERS,
          isRosterFinalized,
          createId: () => `local-${Date.now()}`,
          timestamp: Date.now(),
          updatedBy: 'local-mode',
        });

        if (localResult.outcome === 'duplicate') {
          setShareStatus('This driver is already registered.');
          return false;
        }

        if (localResult.outcome === 'locked') {
          setShareStatus('Registrations are locked for this event.');
          return false;
        }

        setPlayers(localResult.players);
        setWaitingPlayers(localResult.waitingPlayers);
        setShareStatus(
          localResult.outcome === 'waitlist'
            ? 'Grid full. Driver added to Pit Lane.'
            : 'Driver added to the grid.',
        );
        return true;
      }

      try {
        const response = await fetch(EVENT_REGISTRATION_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId,
            ...player,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };

        if (!response.ok) {
          setShareStatus(payload.error || 'Unable to save driver right now.');
          return false;
        }

        setShareStatus(payload.message || 'Driver added to the grid.');
        return true;
      } catch (error) {
        console.error(error);
        setShareStatus('Unable to save driver right now.');
        return false;
      }
    },
    [eventId, isFirebaseAvailable, isRosterFinalized, isShufflingRoster, players, waitingPlayers],
  );

  const shareEvent = useCallback(async () => {
    const eventUrl = window.location.href;
    const shareData = {
      title: preset.title,
      text: preset.shareText,
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
  }, [preset.shareText, preset.title]);

  const drawRoster = useCallback(() => {
    if (isShufflingRoster || players.length < 2) {
      return;
    }

    if (shuffleTimeoutRef.current) {
      window.clearTimeout(shuffleTimeoutRef.current);
    }

    setIsShufflingRoster(true);
    const finalizedIds = shuffleList(players).map((player) => player.id || player);
    const actorId = getCurrentActorId();

    shuffleTimeoutRef.current = window.setTimeout(() => {
      const nextStageResults = createEmptyStageResults();
      setRosterOrder(finalizedIds);
      setIsRosterFinalized(true);
      setLockedAt(Date.now());
      setStageResults(nextStageResults);
      setRaceHistory([]);
      setIsShufflingRoster(false);

      if (isFirebaseAvailable && eventRef.current) {
        void update(eventRef.current, {
          isRosterFinalized: true,
          rosterOrder: finalizedIds,
          registrationStatus: 'locked',
          lockedAt: serverTimestamp(),
          stageResults: nextStageResults,
          raceHistory: [],
          maxPlayers: MAX_PLAYERS,
          lastUpdatedBy: actorId,
          updatedAt: serverTimestamp(),
        }).catch((error) => {
          console.error(error);
          setShareStatus('Failed to lock the draw. Please try again.');
        });
      }
    }, 1600);
  }, [getCurrentActorId, isFirebaseAvailable, isShufflingRoster, players]);

  const deleteParticipant = useCallback(
    async (index: number) => {
      if (index < 0 || index >= players.length) {
        return;
      }

      const actorId = getCurrentActorId();
      const player = players[index];
      const waitingPlayer = waitingPlayers[0] || null;
      const promotedPlayer =
        waitingPlayer && waitingPlayer.id
          ? buildPromotedParticipantState(waitingPlayer, player, waitingPlayer.id)
          : buildPromotedParticipantState(waitingPlayer, player);
      const nextPlayers = [...players];
      const nextWaitingPlayers = [...waitingPlayers];
      const nextRosterOrder = [...rosterOrder];
      let shouldResetStages = false;

      nextPlayers.splice(index, 1);

      if (promotedPlayer) {
        nextPlayers.splice(Math.min(index, nextPlayers.length), 0, promotedPlayer);
      }

      if (waitingPlayer) {
        nextWaitingPlayers.shift();
      }

      if (isRosterFinalized && rosterOrder.length) {
        const slotIndex = findRosterSlotIndexForPlayer(player, rosterOrder);

        if (slotIndex !== -1) {
          nextRosterOrder[slotIndex] = promotedPlayer
            ? buildRosterEntryForPlayer(promotedPlayer, nextRosterOrder)
            : null;
          shouldResetStages = true;
        }
      }

      const nextStageResults = shouldResetStages ? createEmptyStageResults() : stageResults;
      const nextRaceHistory = shouldResetStages ? [] : raceHistory;

      if (!isFirebaseAvailable || !participantsRef.current || !eventRef.current || !player.id) {
        setPlayers(nextPlayers);
        setWaitingPlayers(nextWaitingPlayers);
        setRosterOrder(nextRosterOrder);
        if (shouldResetStages) {
          setStageResults(createEmptyStageResults());
          setRaceHistory([]);
        }
        return;
      }

      try {
        const updates: Record<string, unknown> = {
          [`participants/${player.id}`]: null,
          registrationStatus: getEventRegistrationStatus(
            nextPlayers.length,
            MAX_PLAYERS,
            isRosterFinalized,
          ),
          lastUpdatedBy: actorId,
          updatedAt: serverTimestamp(),
        };

        if (promotedPlayer?.id && waitingPlayer?.id) {
          const { id: promotedId, ...payload } = promotedPlayer;
          updates[`participants/${promotedId}`] = {
            ...payload,
            updatedAt: serverTimestamp(),
            lastUpdatedBy: actorId,
          };
          updates[`waitlist/${waitingPlayer.id}`] = null;
        }

        if (shouldResetStages) {
          updates.rosterOrder = nextRosterOrder;
          updates.stageResults = nextStageResults;
          updates.raceHistory = nextRaceHistory;
        }

        await update(eventRef.current, updates);

        setPlayers(nextPlayers);
        setWaitingPlayers(nextWaitingPlayers);
        setRosterOrder(nextRosterOrder);
        if (shouldResetStages) {
          setStageResults(createEmptyStageResults());
          setRaceHistory([]);
        }
      } catch (error) {
        console.error(error);
        setShareStatus('Unable to delete driver. Please verify your Firebase permissions.');
      }
    },
    [
      getCurrentActorId,
      isFirebaseAvailable,
      isRosterFinalized,
      players,
      raceHistory,
      rosterOrder,
      stageResults,
      waitingPlayers,
    ],
  );

  const deleteWaitingParticipant = useCallback(
    async (index: number) => {
      if (index < 0 || index >= waitingPlayers.length) {
        return;
      }

      const actorId = getCurrentActorId();
      const player = waitingPlayers[index];

      if (!isFirebaseAvailable || !waitlistRef.current || !eventRef.current || !player.id) {
        setWaitingPlayers((current) => current.filter((_, currentIndex) => currentIndex !== index));
        return;
      }

      try {
        await update(eventRef.current, {
          [`waitlist/${player.id}`]: null,
          lastUpdatedBy: actorId,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error(error);
        setShareStatus('Unable to delete pit lane entry. Please verify your Firebase permissions.');
      }
    },
    [getCurrentActorId, isFirebaseAvailable, waitingPlayers],
  );

  const toggleParticipantCheckIn = useCallback(
    async (scope: 'players' | 'waitingPlayers', index: number) => {
      const list = scope === 'players' ? players : waitingPlayers;
      const player = list[index];

      if (!player) {
        return;
      }

      const nextCheckedIn = !player.checkedIn;
      const actorId = getCurrentActorId();
      const pathPrefix = scope === 'players' ? 'participants' : 'waitlist';

      if (!isFirebaseAvailable || !eventRef.current || !player.id) {
        const setter = scope === 'players' ? setPlayers : setWaitingPlayers;
        setter((current) =>
          current.map((entry, currentIndex) =>
            currentIndex === index
              ? {
                  ...entry,
                  checkedIn: nextCheckedIn,
                  updatedAt: Date.now(),
                  lastUpdatedBy: actorId,
                }
              : entry,
          ),
        );
        return;
      }

      try {
        await update(eventRef.current, {
          [`${pathPrefix}/${player.id}/checkedIn`]: nextCheckedIn,
          [`${pathPrefix}/${player.id}/updatedAt`]: serverTimestamp(),
          [`${pathPrefix}/${player.id}/lastUpdatedBy`]: actorId,
          lastUpdatedBy: actorId,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error(error);
        setShareStatus('Unable to update check-in status.');
      }
    },
    [getCurrentActorId, isFirebaseAvailable, players, waitingPlayers],
  );

  const resetBracket = useCallback(async () => {
    setRosterOrder([]);
    setIsRosterFinalized(false);
    setLockedAt(null);
    setStageResults(createEmptyStageResults());
    setRaceHistory([]);
    setIsShufflingRoster(false);

    if (!isFirebaseAvailable || !eventRef.current) {
      return;
    }

    try {
      await update(eventRef.current, {
        rosterOrder: [],
        isRosterFinalized: false,
        registrationStatus: getEventRegistrationStatus(players.length, MAX_PLAYERS, false),
        lockedAt: null,
        stageResults: createEmptyStageResults(),
        raceHistory: [],
        lastUpdatedBy: getCurrentActorId(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(error);
      setShareStatus('Failed to reset stage data.');
    }
  }, [getCurrentActorId, isFirebaseAvailable, players.length]);

  const resetEvent = useCallback(async () => {
    setPlayers([]);
    setWaitingPlayers([]);
    setRosterOrder([]);
    setIsRosterFinalized(false);
    setLockedAt(null);
    setStageResults(createEmptyStageResults());
    setRaceHistory([]);
    setIsShufflingRoster(false);

    if (!isFirebaseAvailable || !eventRef.current) {
      return;
    }

    try {
      await update(eventRef.current, {
        participants: null,
        waitlist: null,
        rosterOrder: [],
        isRosterFinalized: false,
        registrationStatus: 'open',
        lockedAt: null,
        stageResults: createEmptyStageResults(),
        raceHistory: [],
        lastUpdatedBy: getCurrentActorId(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(error);
      setShareStatus('Failed to reset all tournament data.');
    }
  }, [getCurrentActorId, isFirebaseAvailable]);

  const submitRaceResult = useCallback(
    (
      slot: StageRaceSlot,
      finishingOrder: number[],
    ): SelectionResult => {
      if (!isRosterFinalized) {
        return { kind: 'noop' };
      }

      if (
        slot.isLocked ||
        finishingOrder.length < 2 ||
        slot.participantIndexes.length !== finishingOrder.length ||
        new Set(finishingOrder).size !== finishingOrder.length ||
        slot.participantIndexes.some((entrantIndex) => !finishingOrder.includes(entrantIndex))
      ) {
        return { kind: 'noop' };
      }

      const currentStageResults = cloneStageResults(stageResults);
      const existingResults = currentStageResults[slot.stageKey];
      const standardResults = existingResults.filter((result) => result.kind === 'standard');
      const tieBreakResults = existingResults.filter((result) => result.kind === 'tiebreak');
      const nextResult = {
        participantIndexes: [...slot.participantIndexes],
        finishingOrder: [...finishingOrder],
        kind: slot.kind,
        tiebreakBand: slot.tiebreakBand
          ? {
              startRank: slot.tiebreakBand.startRank,
              endRank: slot.tiebreakBand.endRank,
              participantIndexes: [...slot.tiebreakBand.participantIndexes],
            }
          : undefined,
      };

      if (slot.kind === 'standard') {
        const existingResult = standardResults[slot.raceIndex];

        if (
          existingResult &&
          isSameFinishingOrder(existingResult.finishingOrder, finishingOrder)
        ) {
          return { kind: 'noop' };
        }

        currentStageResults[slot.stageKey] = [
          ...standardResults.slice(0, slot.raceIndex),
          nextResult,
        ];
      } else {
        const existingResult = tieBreakResults[slot.raceIndex];

        if (
          existingResult &&
          isSameFinishingOrder(existingResult.finishingOrder, finishingOrder)
        ) {
          return { kind: 'noop' };
        }

        currentStageResults[slot.stageKey] = [
          ...standardResults,
          ...tieBreakResults.slice(0, slot.raceIndex),
          nextResult,
        ];
      }

      if (slot.stageKey !== 'final') {
        currentStageResults.final = [];
      }

      const nextRaceHistory = [
        ...raceHistory,
        {
          id: `${Date.now()}-${slot.key}`,
          stageKey: slot.stageKey,
          raceLabel: slot.label,
          recordedAt: Date.now(),
          previousStageResults: cloneStageResults(stageResults),
        },
      ].slice(-MAX_RACE_HISTORY);

      setStageResults(currentStageResults);
      setRaceHistory(nextRaceHistory);

      if (isFirebaseAvailable && eventRef.current) {
        const actorId = getCurrentActorId();
        void update(eventRef.current, {
          stageResults: currentStageResults,
          raceHistory: nextRaceHistory,
          lastUpdatedBy: actorId,
          updatedAt: serverTimestamp(),
        }).catch((error) => {
          console.error(error);
          setShareStatus('Failed to sync stage state.');
        });
      }

      const nextTournament = buildTournamentStages(
        orderedEntrants,
        currentStageResults,
        isRosterFinalized,
      );

      if (
        slot.stageKey === 'final' &&
        nextTournament.finalStage.isFinalized &&
        nextTournament.podium[0] !== undefined
      ) {
        const championIndex = nextTournament.podium[0];
        const champion = championIndex !== undefined ? orderedEntrants[championIndex] : undefined;

        return {
          kind: 'champion',
          championName:
            champion && !champion.empty ? champion.name : preset.championHeading,
        };
      }

      return { kind: 'winner' };
    },
    [
      getCurrentActorId,
      isFirebaseAvailable,
      isRosterFinalized,
      orderedEntrants,
      raceHistory,
      stageResults,
      preset.championHeading,
    ],
  );

  const undoLastRaceResult = useCallback(() => {
    if (!isRosterFinalized || raceHistory.length === 0) {
      return false;
    }

    const previousEntry = raceHistory[raceHistory.length - 1];
    const nextRaceHistory = raceHistory.slice(0, -1);

    setStageResults(cloneStageResults(previousEntry.previousStageResults));
    setRaceHistory(nextRaceHistory);

    if (isFirebaseAvailable && eventRef.current) {
      const actorId = getCurrentActorId();
      void update(eventRef.current, {
        stageResults: previousEntry.previousStageResults,
        raceHistory: nextRaceHistory,
        lastUpdatedBy: actorId,
        updatedAt: serverTimestamp(),
      }).catch((error) => {
        console.error(error);
        setShareStatus('Failed to undo the last result.');
      });
    }

    return true;
  }, [getCurrentActorId, isFirebaseAvailable, isRosterFinalized, raceHistory]);

  const isRosterFull = useMemo(() => players.length >= MAX_PLAYERS, [players.length]);
  const shouldQueueSignup = useMemo(() => registrationStatus === 'full', [registrationStatus]);
  const canRegister = useMemo(() => registrationStatus !== 'locked', [registrationStatus]);
  const checkedInPlayersCount = useMemo(
    () => players.filter((player) => player.checkedIn).length,
    [players],
  );

  return {
    eventId,
    players,
    waitingPlayers,
    rosterOrder,
    isRosterFinalized,
    lockedAt,
    registrationStatus,
    stageResults,
    raceHistory,
    groupStages,
    finalStage,
    podium,
    completedStandardRaceCount,
    totalStandardRaceCount,
    completedTieBreakCount,
    resultsReady,
    isFirebaseAvailable,
    isShufflingRoster,
    isRosterFull,
    canRegister,
    shouldQueueSignup,
    checkedInPlayersCount,
    shareStatus,
    championName: currentChampionName,
    setShareStatus,
    submitParticipant,
    shareEvent,
    drawRoster,
    deleteParticipant,
    deleteWaitingParticipant,
    toggleParticipantCheckIn,
    resetBracket,
    resetEvent,
    submitRaceResult,
    undoLastRaceResult,
  };
}
