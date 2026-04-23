import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EVENT_REGISTRATION_ENDPOINT,
  MAX_PLAYERS,
} from '../constants';
import {
  hasLocalDevelopmentAdminSession,
  isLocalDevelopmentMode,
  LOCAL_DEV_ADMIN_UID,
} from '../lib/adminAccess';
import { getStoredAdminSessionToken } from '../lib/adminSession';
import type {
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
  getGroupFinalistDecision,
  padEntrantsToGrid,
  shuffleList,
} from '../utils/bracket';
import {
  applyParticipantRegistration,
  getEventRegistrationStatus,
  normalizePlayerRecord,
  normalizeRegistrationInput,
} from '../utils/registration';
import {
  loadPersistedEventState,
  MAX_RACE_HISTORY,
  normalizeRaceHistory,
  normalizeRosterEntry,
  normalizeStageResults,
  persistEventState,
} from './tournament/state';

const EVENT_STATE_ENDPOINT = '/api/events/state';
const EVENT_STATE_POLL_INTERVAL_MS = 2500;

interface SubmitPlayerInput {
  name: string;
  nickname: string;
  teamTag: string;
}

interface EventStateResponse {
  state?: PersistedEventState;
  error?: string;
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

  const didRestoreLocalState = useRef(false);
  const pollTimeoutRef = useRef<number | null>(null);
  const shuffleTimeoutRef = useRef<number | null>(null);
  const registrationStatus = useMemo<EventRegistrationStatus>(
    () => getEventRegistrationStatus(players.length, MAX_PLAYERS, isRosterFinalized),
    [isRosterFinalized, players.length],
  );
  const getCurrentActorId = useCallback(() => {
    if (hasLocalDevelopmentAdminSession()) {
      return LOCAL_DEV_ADMIN_UID;
    }

    return 'race-control';
  }, []);

  const applyRemoteState = useCallback((state: PersistedEventState) => {
    setPlayers(Array.isArray(state.players) ? state.players.map((player) => normalizePlayerRecord(player)) : []);
    setWaitingPlayers(
      Array.isArray(state.waitingPlayers)
        ? state.waitingPlayers.map((player) => normalizePlayerRecord(player))
        : [],
    );
    setRosterOrder(
      Array.isArray(state.rosterOrder)
        ? state.rosterOrder.map((entry) => normalizeRosterEntry(entry))
        : [],
    );
    setIsRosterFinalized(Boolean(state.isRosterFinalized));
    setLockedAt(typeof state.lockedAt === 'number' ? state.lockedAt : null);
    setStageResults(normalizeStageResults(state.stageResults));
    setRaceHistory(normalizeRaceHistory(state.raceHistory));
  }, []);

  const patchRemoteEvent = useCallback(
    async (updates: Record<string, unknown>, failureMessage: string) => {
      const token = getStoredAdminSessionToken();

      if (!token) {
        setShareStatus('Admin session expired. Please log in again.');
        return false;
      }

      try {
        const response = await fetch(EVENT_STATE_ENDPOINT, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId,
            updates,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as EventStateResponse;

        if (!response.ok || !payload.state) {
          setShareStatus(payload.error || failureMessage);
          return false;
        }

        applyRemoteState(payload.state);
        setIsFirebaseAvailable(true);
        return true;
      } catch (error) {
        console.error(error);
        setShareStatus(failureMessage);
        setIsFirebaseAvailable(false);
        return false;
      }
    },
    [applyRemoteState, eventId],
  );

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
    if (isLocalDevelopmentMode()) {
      setIsFirebaseAvailable(false);
      setShareStatus('Local development mode enabled. Registrations and admin changes stay in this browser.');
      return;
    }

    let isActive = true;

    const loadRemoteState = async () => {
      try {
        const response = await fetch(`${EVENT_STATE_ENDPOINT}?eventId=${encodeURIComponent(eventId)}`);
        const payload = (await response.json().catch(() => ({}))) as EventStateResponse;

        if (!response.ok || !payload.state) {
          throw new Error(payload.error || 'Unable to load event state.');
        }

        if (!isActive) {
          return;
        }

        applyRemoteState(payload.state);
        setIsFirebaseAvailable(true);
        setShareStatus((current) =>
          current && !current.includes('unavailable')
            ? current
            : 'Live sync enabled. Share this page to collect driver registrations.',
        );
      } catch (error) {
        console.error('[RK Events] Event state sync error:', error);

        if (isActive) {
          setIsFirebaseAvailable(false);
          setShareStatus('Live sync unavailable. Retrying...');
        }
      } finally {
        if (isActive) {
          pollTimeoutRef.current = window.setTimeout(loadRemoteState, EVENT_STATE_POLL_INTERVAL_MS);
        }
      }
    };

    void loadRemoteState();

    return () => {
      isActive = false;

      if (pollTimeoutRef.current) {
        window.clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [applyRemoteState, eventId]);

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

      if (isLocalDevelopmentMode()) {
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
          state?: PersistedEventState;
        };

        if (!response.ok) {
          setShareStatus(payload.error || 'Unable to save driver right now.');
          return false;
        }

        if (payload.state) {
          applyRemoteState(payload.state);
        }

        setIsFirebaseAvailable(true);
        setShareStatus(payload.message || 'Driver added to the grid.');
        return true;
      } catch (error) {
        console.error(error);
        setIsFirebaseAvailable(false);
        setShareStatus('Unable to save driver right now.');
        return false;
      }
    },
    [applyRemoteState, eventId, isRosterFinalized, isShufflingRoster, players, waitingPlayers],
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

      if (!isLocalDevelopmentMode()) {
        void patchRemoteEvent(
          {
            isRosterFinalized: true,
            rosterOrder: finalizedIds,
            registrationStatus: 'locked',
            lockedAt: Date.now(),
            stageResults: nextStageResults,
            raceHistory: [],
            maxPlayers: MAX_PLAYERS,
            lastUpdatedBy: actorId,
            updatedAt: Date.now(),
          },
          'Failed to lock the draw. Please try again.',
        );
      }
    }, 1600);
  }, [getCurrentActorId, isShufflingRoster, patchRemoteEvent, players]);

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

      if (isLocalDevelopmentMode() || !player.id) {
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
          updatedAt: Date.now(),
        };

        if (promotedPlayer?.id && waitingPlayer?.id) {
          const { id: promotedId, ...payload } = promotedPlayer;
          updates[`participants/${promotedId}`] = {
            ...payload,
            updatedAt: Date.now(),
            lastUpdatedBy: actorId,
          };
          updates[`waitlist/${waitingPlayer.id}`] = null;
        }

        if (shouldResetStages) {
          updates.rosterOrder = nextRosterOrder;
          updates.stageResults = nextStageResults;
          updates.raceHistory = nextRaceHistory;
        }

        const synced = await patchRemoteEvent(updates, 'Unable to delete driver. Please verify your admin session.');

        if (synced) {
          setPlayers(nextPlayers);
          setWaitingPlayers(nextWaitingPlayers);
          setRosterOrder(nextRosterOrder);
          if (shouldResetStages) {
            setStageResults(createEmptyStageResults());
            setRaceHistory([]);
          }
        }
      } catch (error) {
        console.error(error);
        setShareStatus('Unable to delete driver. Please verify your admin session.');
      }
    },
    [
      getCurrentActorId,
      isRosterFinalized,
      patchRemoteEvent,
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

      if (isLocalDevelopmentMode() || !player.id) {
        setWaitingPlayers((current) => current.filter((_, currentIndex) => currentIndex !== index));
        return;
      }

      try {
        await patchRemoteEvent(
          {
            [`waitlist/${player.id}`]: null,
            lastUpdatedBy: actorId,
            updatedAt: Date.now(),
          },
          'Unable to delete pit lane entry. Please verify your admin session.',
        );
      } catch (error) {
        console.error(error);
        setShareStatus('Unable to delete pit lane entry. Please verify your admin session.');
      }
    },
    [getCurrentActorId, patchRemoteEvent, waitingPlayers],
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

      if (isLocalDevelopmentMode() || !player.id) {
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
        await patchRemoteEvent(
          {
            [`${pathPrefix}/${player.id}/checkedIn`]: nextCheckedIn,
            [`${pathPrefix}/${player.id}/updatedAt`]: Date.now(),
            [`${pathPrefix}/${player.id}/lastUpdatedBy`]: actorId,
            lastUpdatedBy: actorId,
            updatedAt: Date.now(),
          },
          'Unable to update check-in status.',
        );
      } catch (error) {
        console.error(error);
        setShareStatus('Unable to update check-in status.');
      }
    },
    [getCurrentActorId, patchRemoteEvent, players, waitingPlayers],
  );

  const resetBracket = useCallback(async () => {
    setRosterOrder([]);
    setIsRosterFinalized(false);
    setLockedAt(null);
    setStageResults(createEmptyStageResults());
    setRaceHistory([]);
    setIsShufflingRoster(false);

    if (isLocalDevelopmentMode()) {
      return;
    }

    try {
      await patchRemoteEvent(
        {
          rosterOrder: [],
          isRosterFinalized: false,
          registrationStatus: getEventRegistrationStatus(players.length, MAX_PLAYERS, false),
          lockedAt: null,
          stageResults: createEmptyStageResults(),
          raceHistory: [],
          lastUpdatedBy: getCurrentActorId(),
          updatedAt: Date.now(),
        },
        'Failed to reset stage data.',
      );
    } catch (error) {
      console.error(error);
      setShareStatus('Failed to reset stage data.');
    }
  }, [getCurrentActorId, patchRemoteEvent, players.length]);

  const resetEvent = useCallback(async () => {
    setPlayers([]);
    setWaitingPlayers([]);
    setRosterOrder([]);
    setIsRosterFinalized(false);
    setLockedAt(null);
    setStageResults(createEmptyStageResults());
    setRaceHistory([]);
    setIsShufflingRoster(false);

    if (isLocalDevelopmentMode()) {
      return;
    }

    try {
      await patchRemoteEvent(
        {
          participants: null,
          waitlist: null,
          rosterOrder: [],
          isRosterFinalized: false,
          registrationStatus: 'open',
          lockedAt: null,
          stageResults: createEmptyStageResults(),
          raceHistory: [],
          lastUpdatedBy: getCurrentActorId(),
          updatedAt: Date.now(),
        },
        'Failed to reset all tournament data.',
      );
    } catch (error) {
      console.error(error);
      setShareStatus('Failed to reset all tournament data.');
    }
  }, [getCurrentActorId, patchRemoteEvent]);

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
      const previousTournament = buildTournamentStages(
        orderedEntrants,
        stageResults,
        isRosterFinalized,
      );
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

      if (!isLocalDevelopmentMode()) {
        const actorId = getCurrentActorId();
        void patchRemoteEvent(
          {
            stageResults: currentStageResults,
            raceHistory: nextRaceHistory,
            lastUpdatedBy: actorId,
            updatedAt: Date.now(),
          },
          'Failed to sync stage state.',
        );
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

      const groupFinalistDecision = getGroupFinalistDecision(
        slot.stageKey,
        previousTournament.groupStages,
        nextTournament.groupStages,
        orderedEntrants,
      );

      if (groupFinalistDecision) {
        return groupFinalistDecision;
      }

      return { kind: 'saved' };
    },
    [
      getCurrentActorId,
      isRosterFinalized,
      orderedEntrants,
      patchRemoteEvent,
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

    if (!isLocalDevelopmentMode()) {
      const actorId = getCurrentActorId();
      void patchRemoteEvent(
        {
          stageResults: previousEntry.previousStageResults,
          raceHistory: nextRaceHistory,
          lastUpdatedBy: actorId,
          updatedAt: Date.now(),
        },
        'Failed to undo the last result.',
      );
    }

    return true;
  }, [getCurrentActorId, isRosterFinalized, patchRemoteEvent, raceHistory]);

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
