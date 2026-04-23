import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { getEventPreset, MAX_PLAYERS } from '../constants';
import { useCelebration } from '../hooks/useCelebration';
import { useProfileCard } from '../hooks/useProfileCard';
import { useTournamentEvent } from '../hooks/useTournamentEvent';
import type { BuildingConfig, StageRaceSlot, ViewMode } from '../types';
import {
  getBracketEntrants,
  getStageTitle,
  padEntrantsToGrid,
} from '../utils/bracket';
import { createResultPosterPng } from '../utils/resultShare';
import { BracketPanel } from './BracketPanel';
import { CelebrationLayer } from './CelebrationLayer';
import { EntriesPanel } from './EntriesPanel';
import { EventSummary } from './EventSummary';
import { HeroHeader } from './HeroHeader';
import { MatchScoreModal } from './MatchScoreModal';
import { PodiumPopup } from './PodiumPopup';
import { ProfileCard } from './ProfileCard';
import { RegistrationPanel } from './RegistrationPanel';

interface RaceDialogState {
  slot: StageRaceSlot;
  title: string;
  clientX?: number;
  clientY?: number;
}

interface BuildingEventViewProps {
  building: BuildingConfig;
  currentView: ViewMode;
  isAdminMode: boolean;
  onRequestAdminLogin: () => void;
  onViewChange: (view: ViewMode) => void;
  onLogout: () => void;
}

export function BuildingEventView({
  building,
  currentView,
  isAdminMode,
  onRequestAdminLogin,
  onViewChange,
  onLogout,
}: BuildingEventViewProps) {
  const preset = getEventPreset(building);
  const tournament = useTournamentEvent(building.eventId, preset, building.brandVariant);
  const profileCard = useProfileCard();
  const celebration = useCelebration();

  const [showPodium, setShowPodium] = useState(false);
  const [resultShareStatus, setResultShareStatus] = useState('');
  const [isSharingResult, setIsSharingResult] = useState(false);
  const isSharingResultRef = useRef(false);
  const [isBracketFocus, setIsBracketFocus] = useState(
    () => document.body.classList.contains('bracket-focus'),
  );
  const bracketFocusScrollYRef = useRef(0);
  const [stamps, setStamps] = useState<{ id: number; x: number; y: number }[]>([]);
  const [scoreDialog, setScoreDialog] = useState<RaceDialogState | null>(null);

  const canUseAdminControls = isAdminMode && currentView === 'admin';
  const canUseRosterControls = isAdminMode;

  const entrants = useMemo(
    () =>
      padEntrantsToGrid(
        getBracketEntrants(
          tournament.players,
          tournament.rosterOrder,
          tournament.isRosterFinalized,
        ),
      ),
    [tournament.isRosterFinalized, tournament.players, tournament.rosterOrder],
  );

  const countText = useMemo(() => {
    if (tournament.isRosterFull) {
      return `${preset.countLabel}: ${tournament.players.length} / ${MAX_PLAYERS} (full)`;
    }

    return `${preset.countLabel}: ${tournament.players.length} / ${MAX_PLAYERS}`;
  }, [preset.countLabel, tournament.isRosterFull, tournament.players.length]);

  useEffect(() => {
    document.body.classList.toggle('bracket-focus', isBracketFocus);
    window.scrollTo({
      left: 0,
      top: isBracketFocus ? 0 : bracketFocusScrollYRef.current,
    });

    return () => {
      document.body.classList.remove('bracket-focus');
    };
  }, [isBracketFocus]);

  useEffect(() => {
    if (showPodium) {
      return;
    }

    setResultShareStatus('');
    setIsSharingResult(false);
    isSharingResultRef.current = false;
  }, [showPodium]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && profileCard.card.pinned) {
        profileCard.hideProfileCard(true);
        return;
      }

      if (event.key === 'Escape' && isBracketFocus) {
        setIsBracketFocus(false);
      }
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (!profileCard.card.pinned) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;

      if (target?.closest('.player-row') || target?.closest('[data-profile-card-anchor="true"]')) {
        return;
      }

      profileCard.hideProfileCard(true);
    };

    const handleResize = () => {
      profileCard.hideProfileCard(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    document.addEventListener('click', handleDocumentClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [isBracketFocus, profileCard.card.pinned, profileCard.hideProfileCard]);

  function handleViewChange(nextView: ViewMode) {
    if (nextView === 'admin' && !isAdminMode) {
      onRequestAdminLogin();
      return;
    }

    if (nextView !== 'admin' && isBracketFocus) {
      setIsBracketFocus(false);
    }

    if (nextView !== 'admin') {
      setScoreDialog(null);
    }

    profileCard.hideProfileCard(true);
    startTransition(() => onViewChange(nextView));
  }

  function handleAdminLogout() {
    setIsBracketFocus(false);
    setScoreDialog(null);
    profileCard.hideProfileCard(true);
    startTransition(() => onViewChange('public'));
    onLogout();
  }

  function handleBracketDecisionResult(
    result: { kind: 'winner' | 'champion' | 'noop'; championName?: string },
    clientX?: number,
    clientY?: number,
  ) {
    if (result.kind === 'champion') {
      celebration.triggerChampionCelebration(result.championName || preset.championHeading);
      window.setTimeout(() => {
        setShowPodium(true);
      }, 3000);
      return;
    }

    if (result.kind === 'winner') {
      celebration.triggerWinnerConfetti(clientX, clientY);

      if (clientX !== undefined && clientY !== undefined) {
        const newId = Date.now();
        setStamps((current) => [...current, { id: newId, x: clientX, y: clientY }]);
        window.setTimeout(
          () => setStamps((current) => current.filter((stamp) => stamp.id !== newId)),
          800,
        );
      }
    }
  }

  function handleRequestRaceResult(
    slot: StageRaceSlot,
    clientX?: number,
    clientY?: number,
  ) {
    profileCard.hideProfileCard(true);

    if (slot.participantIndexes.length < 2) {
      return;
    }

    const participants = slot.participantIndexes
      .map((entrantIndex) => entrants[entrantIndex])
      .filter((player) => player && !player.empty);

    if (participants.length !== slot.participantIndexes.length) {
      return;
    }

    setScoreDialog({
      slot,
      title: `${getStageTitle(slot.stageKey)} ${slot.label}`,
      clientX,
      clientY,
    });
  }

  function handleSubmitScore(finishingOrder: number[]) {
    if (!scoreDialog) {
      return;
    }

    const result = tournament.submitRaceResult(scoreDialog.slot, finishingOrder);
    const { clientX, clientY } = scoreDialog;
    setScoreDialog(null);
    handleBracketDecisionResult(result, clientX, clientY);
  }

  function handleUndoLastResult() {
    profileCard.hideProfileCard(true);
    setScoreDialog(null);
    setShowPodium(false);
    tournament.undoLastRaceResult();
  }

  const [firstPlace, secondPlace, thirdPlace] = tournament.podium;

  async function handleShareResult() {
    if (isSharingResultRef.current) {
      return;
    }

    isSharingResultRef.current = true;
    setResultShareStatus('Preparing result image...');
    setIsSharingResult(true);

    try {
      const imageBlob = await createResultPosterPng({
        brandVariant: building.brandVariant,
        preset,
        firstPlace,
        secondPlace,
        thirdPlace,
      });
      const filename = `${preset.resultFilePrefix}-${new Date().toISOString().slice(0, 10)}.png`;
      const shareFile =
        typeof File === 'function'
          ? new File([imageBlob], filename, { type: 'image/png' })
          : null;

      if (
        shareFile &&
        navigator.share &&
        (!navigator.canShare || navigator.canShare({ files: [shareFile] }))
      ) {
        try {
          await navigator.share({
            files: [shareFile],
            title: preset.resultShareTitle,
            text: preset.resultShareText,
          });
          setResultShareStatus('Result image shared.');
          return;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            setResultShareStatus('');
            return;
          }
        }
      }

      if (window.isSecureContext && navigator.clipboard && 'ClipboardItem' in window) {
        try {
          await navigator.clipboard.write([
            new window.ClipboardItem({
              'image/png': imageBlob,
            }),
          ]);
          setResultShareStatus('Result image copied to clipboard.');
          return;
        } catch (error) {
          console.error(error);
        }
      }

      const downloadUrl = URL.createObjectURL(imageBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = filename;
      document.body.append(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setResultShareStatus('Result image downloaded as PNG.');
    } catch (error) {
      console.error(error);
      setResultShareStatus('Unable to share the result image on this device.');
    } finally {
      isSharingResultRef.current = false;
      setIsSharingResult(false);
    }
  }

  const dialogParticipants = scoreDialog
    ? scoreDialog.slot.participantIndexes
        .map((entrantIndex) => ({
          entrantIndex,
          name: entrants[entrantIndex]?.name || 'TBD',
        }))
        .filter((participant) => participant.name !== 'TBD')
    : [];

  return (
    <>
      <PodiumPopup
        visible={showPodium}
        onClose={() => setShowPodium(false)}
        firstPlace={firstPlace}
        secondPlace={secondPlace}
        thirdPlace={thirdPlace}
        onShareResult={handleShareResult}
        shareStatus={resultShareStatus}
        isSharingResult={isSharingResult}
      />
      <MatchScoreModal
        visible={Boolean(scoreDialog)}
        title={scoreDialog?.title || 'Race'}
        participants={dialogParticipants}
        initialOrder={scoreDialog?.slot.result?.finishingOrder}
        preset={preset}
        onClose={() => setScoreDialog(null)}
        onSubmit={handleSubmitScore}
      />
      {stamps.map((stamp) => (
        <div key={stamp.id} className="stamp-winner" style={{ left: stamp.x, top: stamp.y }}>
          BOOST
        </div>
      ))}
      <CelebrationLayer
        canvasRef={celebration.canvasRef}
        championName={celebration.championName}
        preset={preset}
      />
      <ProfileCard
        cardRef={profileCard.cardRef}
        data={profileCard.card.data}
        visible={profileCard.card.visible}
        pinned={profileCard.card.pinned}
        left={profileCard.card.left}
        top={profileCard.card.top}
      />

      <main className="page">
        <HeroHeader
          currentView={currentView}
          headline={building.headline}
          shareStatus={tournament.shareStatus}
          onShare={tournament.shareEvent}
          onViewChange={handleViewChange}
        />
        <EventSummary
          registrationStatus={tournament.registrationStatus}
          checkedInPlayersCount={tournament.checkedInPlayersCount}
          showAdminControls={currentView === 'admin'}
          isAdminMode={isAdminMode}
          canUseAdminControls={canUseAdminControls}
          onLogin={onRequestAdminLogin}
          onLogout={handleAdminLogout}
          onResetBracket={() => {
            if (window.confirm('Reset the draw and keep the registered drivers?')) {
              void tournament.resetBracket();
            }
          }}
          onResetEvent={() => {
            if (window.confirm('Reset the entire event, including all registrations and results?')) {
              void tournament.resetEvent();
            }
          }}
        />

        <div className={`content${currentView !== 'admin' ? ' content-single' : ''}`}>
          <div className="view-column">
            {currentView === 'public' ? (
              <div className="view-panel view-slot-grid public-layout" role="tabpanel">
                <RegistrationPanel
                  buttonText={
                    !tournament.canRegister
                      ? 'Registrations Locked'
                      : tournament.shouldQueueSignup
                        ? 'Join Pit Lane'
                        : 'Add Driver'
                  }
                  disabled={tournament.isShufflingRoster || !tournament.canRegister}
                  statusMessage={
                    tournament.canRegister
                      ? tournament.shareStatus
                      : 'The draw is locked. Registrations are closed for this building.'
                  }
                  preset={preset}
                  onSubmit={tournament.submitParticipant}
                />
                <EntriesPanel
                  players={tournament.players}
                  waitingPlayers={tournament.waitingPlayers}
                  countText={countText}
                  canDelete={false}
                  preset={preset}
                  onDeletePlayer={tournament.deleteParticipant}
                  onDeleteWaitingPlayer={tournament.deleteWaitingParticipant}
                  onTogglePlayerCheckIn={tournament.toggleParticipantCheckIn.bind(null, 'players')}
                  onToggleWaitingPlayerCheckIn={tournament.toggleParticipantCheckIn.bind(null, 'waitingPlayers')}
                  getProfileHandlers={profileCard.getProfileHandlers}
                />
              </div>
            ) : (
              <section className="view-panel admin-view" role="tabpanel">
                <div className="view-slot-grid admin-slot-grid">
                  <EntriesPanel
                    players={tournament.players}
                    waitingPlayers={tournament.waitingPlayers}
                    countText={countText}
                    canDelete={canUseAdminControls}
                    canToggleCheckIn={canUseAdminControls}
                    preset={preset}
                    onDeletePlayer={tournament.deleteParticipant}
                    onDeleteWaitingPlayer={tournament.deleteWaitingParticipant}
                    onTogglePlayerCheckIn={tournament.toggleParticipantCheckIn.bind(null, 'players')}
                    onToggleWaitingPlayerCheckIn={tournament.toggleParticipantCheckIn.bind(null, 'waitingPlayers')}
                    getProfileHandlers={profileCard.getProfileHandlers}
                  />
                </div>
              </section>
            )}
          </div>

          {currentView === 'admin' ? (
            <BracketPanel
              entrants={entrants}
              groupStages={tournament.groupStages}
              finalStage={tournament.finalStage}
              completedStandardRaceCount={tournament.completedStandardRaceCount}
              totalStandardRaceCount={tournament.totalStandardRaceCount}
              completedTieBreakCount={tournament.completedTieBreakCount}
              isRosterFinalized={tournament.isRosterFinalized}
              isShufflingRoster={tournament.isShufflingRoster}
              canUseRosterControls={canUseRosterControls}
              isBracketFocus={isBracketFocus}
              preset={preset}
              getProfileHandlers={profileCard.getProfileHandlers}
              onDrawRoster={tournament.drawRoster}
              onToggleFocus={() => {
                profileCard.hideProfileCard(true);
                setIsBracketFocus((current) => {
                  if (!current) {
                    bracketFocusScrollYRef.current = window.scrollY;
                  }

                  return !current;
                });
              }}
              canUndoLastResult={canUseRosterControls && tournament.raceHistory.length > 0}
              onUndoLastResult={handleUndoLastResult}
              resultsReady={tournament.resultsReady}
              onOpenResults={() => setShowPodium(true)}
              onRequestRaceResult={handleRequestRaceResult}
              onScroll={() => profileCard.hideProfileCard(true)}
            />
          ) : null}
        </div>
      </main>
    </>
  );
}
