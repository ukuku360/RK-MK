import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_PLAYERS } from './constants';
import { BracketPanel } from './components/BracketPanel';
import { CelebrationLayer } from './components/CelebrationLayer';
import { EntriesPanel } from './components/EntriesPanel';
import { EventSummary } from './components/EventSummary';
import { CapacityGauge } from './components/CapacityGauge';
import { HeroHeader } from './components/HeroHeader';
import { MatchScoreModal } from './components/MatchScoreModal';
import { PageOrnaments } from './components/PageOrnaments';
import { ProfileCard } from './components/ProfileCard';
import { RegistrationPanel } from './components/RegistrationPanel';
import { useCelebration } from './hooks/useCelebration';
import { useProfileCard } from './hooks/useProfileCard';
import { useTournamentEvent } from './hooks/useTournamentEvent';
import { ClickParticles } from './components/ClickParticles';
import { AdminGateModal } from './components/AdminGateModal';
import { PodiumPopup } from './components/PodiumPopup';
import {
  createEmptyBracketEntrant,
  getBracketEntrants,
  getMatchParticipantIndexes,
  getResolvedMatchWinner,
  getThirdPlaceEntrantIndexes,
  getWinnerKey,
} from './utils/bracket';
import { THIRD_PLACE_KEY } from './constants';
import type { SelectionResult, ViewMode } from './types';
import { createResultPosterPng } from './utils/resultShare';

interface ScoreDialogState {
  kind: 'match' | 'third-place';
  title: string;
  scoreKey: string;
  leftPlayerName: string;
  rightPlayerName: string;
  clientX?: number;
  clientY?: number;
  matchLevel?: number;
  matchIndex?: number;
}

export default function App() {
  const tournament = useTournamentEvent();
  const profileCard = useProfileCard();
  const celebration = useCelebration();

  const [currentView, setCurrentView] = useState<ViewMode>('warriors');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [showPodium, setShowPodium] = useState(false);
  const [resultShareStatus, setResultShareStatus] = useState('');
  const [isSharingResult, setIsSharingResult] = useState(false);
  const isSharingResultRef = useRef(false);
  const [isBracketFocus, setIsBracketFocus] = useState(
    () => document.body.classList.contains('bracket-focus'),
  );
  const [stamps, setStamps] = useState<{ id: number; x: number; y: number }[]>([]);
  const [scoreDialog, setScoreDialog] = useState<ScoreDialogState | null>(null);

  const canUseAdminControls = isAdminMode && currentView === 'admin';
  const canUseRosterControls = isAdminMode;

  const countText = useMemo(() => {
    if (tournament.isRosterFull) {
      return `Entries: ${tournament.players.length} / ${MAX_PLAYERS} (full)`;
    }

    return `Entries: ${tournament.players.length} / ${MAX_PLAYERS}`;
  }, [tournament.isRosterFull, tournament.players.length]);

  useEffect(() => {
    document.body.classList.toggle('bracket-focus', isBracketFocus);

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

      if (target?.closest('.player-row') || target?.closest('g.node-profileable')) {
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
      setShowAdminGate(true);
      return;
    }

    if (nextView !== 'admin' && isBracketFocus) {
      setIsBracketFocus(false);
    }

    if (nextView !== 'admin') {
      setScoreDialog(null);
    }

    profileCard.hideProfileCard(true);
    startTransition(() => setCurrentView(nextView));
  }

  function handleAdminLoginSuccess() {
    setShowAdminGate(false);
    setIsAdminMode(true);
    startTransition(() => setCurrentView('admin'));
  }

  function handleAdminLogout() {
    setIsAdminMode(false);
    setIsBracketFocus(false);
    setScoreDialog(null);
    profileCard.hideProfileCard(true);
    startTransition(() => setCurrentView('warriors'));
  }

  function handleBracketDecisionResult(
    result: SelectionResult,
    clientX?: number,
    clientY?: number,
  ) {
    if (result.kind === 'champion') {
      celebration.triggerChampionCelebration(result.championName || 'Champion');
      setTimeout(() => {
        setShowPodium(true);
      }, 3000);
      return;
    }

    if (result.kind === 'winner') {
      celebration.triggerWinnerConfetti(clientX, clientY);
      if (clientX !== undefined && clientY !== undefined) {
        const newId = Date.now();
        setStamps((s) => [...s, { id: newId, x: clientX, y: clientY }]);
        setTimeout(() => setStamps((s) => s.filter((stamp) => stamp.id !== newId)), 800);
        
        const svgElement = document.getElementById('bracketSvg');
        if (svgElement) {
          svgElement.classList.remove('shake-animation');
          void svgElement.offsetWidth;
          svgElement.classList.add('shake-animation');
          setTimeout(() => svgElement.classList.remove('shake-animation'), 300);
        }
      }
    }
  }

  const entrants = useMemo(() => {
    const nextEntrants = getBracketEntrants(
      tournament.players,
      tournament.rosterOrder,
      tournament.isRosterFinalized,
    );

    while (nextEntrants.length < MAX_PLAYERS) {
      nextEntrants.push(createEmptyBracketEntrant());
    }

    return nextEntrants;
  }, [tournament.isRosterFinalized, tournament.players, tournament.rosterOrder]);

  function handleRequestMatchScore(
    matchLevel: number,
    matchIndex: number,
    clientX?: number,
    clientY?: number,
  ) {
    profileCard.hideProfileCard(true);

    const participantIndexes = getMatchParticipantIndexes(
      matchLevel,
      matchIndex,
      entrants,
      tournament.matchWinners,
    );

    if (participantIndexes.length !== 2) {
      return;
    }

    const [leftIndex, rightIndex] = participantIndexes;
    const leftPlayer = entrants[leftIndex];
    const rightPlayer = entrants[rightIndex];

    if (!leftPlayer || !rightPlayer || leftPlayer.empty || rightPlayer.empty) {
      return;
    }

    const roundTitle =
      matchLevel === 1
        ? 'Round 1'
        : matchLevel === 2
          ? 'Quarterfinal'
          : matchLevel === 3
            ? 'Semifinal'
            : 'Final';

    setScoreDialog({
      kind: 'match',
      title: `${roundTitle} Match`,
      scoreKey: getWinnerKey(matchLevel, matchIndex),
      leftPlayerName: leftPlayer.name,
      rightPlayerName: rightPlayer.name,
      clientX,
      clientY,
      matchLevel,
      matchIndex,
    });
  }

  function handleRequestThirdPlaceScore(clientX?: number, clientY?: number) {
    profileCard.hideProfileCard(true);

    const thirdPlaceEntrants = getThirdPlaceEntrantIndexes(entrants, tournament.matchWinners);
    const [leftIndex, rightIndex] = thirdPlaceEntrants;

    if (leftIndex === undefined || rightIndex === undefined) {
      return;
    }

    const leftPlayer = entrants[leftIndex];
    const rightPlayer = entrants[rightIndex];

    if (!leftPlayer || !rightPlayer || leftPlayer.empty || rightPlayer.empty) {
      return;
    }

    setScoreDialog({
      kind: 'third-place',
      title: '3rd Place Playoff',
      scoreKey: THIRD_PLACE_KEY,
      leftPlayerName: leftPlayer.name,
      rightPlayerName: rightPlayer.name,
      clientX,
      clientY,
    });
  }

  function handleSubmitScore(leftScore: number, rightScore: number) {
    if (!scoreDialog) {
      return;
    }

    const result =
      scoreDialog.kind === 'match' && scoreDialog.matchLevel !== undefined && scoreDialog.matchIndex !== undefined
        ? tournament.submitMatchScore(
            scoreDialog.matchLevel,
            scoreDialog.matchIndex,
            leftScore,
            rightScore,
          )
        : tournament.submitThirdPlaceScore(leftScore, rightScore);

    const { clientX, clientY } = scoreDialog;
    setScoreDialog(null);
    handleBracketDecisionResult(result, clientX, clientY);
  }

  function handleUndoLastResult() {
    profileCard.hideProfileCard(true);
    setScoreDialog(null);
    setShowPodium(false);
    tournament.undoLastMatchResult();
  }

  const leftFinalistIndex = getResolvedMatchWinner(3, 0, entrants, tournament.matchWinners);
  const rightFinalistIndex = getResolvedMatchWinner(3, 1, entrants, tournament.matchWinners);
  const thirdPlaceEntrants = getThirdPlaceEntrantIndexes(entrants, tournament.matchWinners);
  const secondPlaceIndex = tournament.championIndex === leftFinalistIndex ? rightFinalistIndex : leftFinalistIndex;
  const thirdPlacePlayoffRequired = thirdPlaceEntrants.every((entrantIndex) => entrantIndex !== undefined);

  const firstPlace = tournament.championIndex !== undefined ? entrants[tournament.championIndex] : undefined;
  const secondPlace = secondPlaceIndex !== undefined ? entrants[secondPlaceIndex] : undefined;
  const thirdPlace = tournament.matchWinners[THIRD_PLACE_KEY] !== undefined ? entrants[tournament.matchWinners[THIRD_PLACE_KEY]] : undefined;
  const resultsReady =
    tournament.championIndex !== undefined &&
    (!thirdPlacePlayoffRequired || (thirdPlace !== undefined && !thirdPlace.empty));

  async function handleShareResult() {
    if (isSharingResultRef.current) {
      return;
    }

    isSharingResultRef.current = true;
    setResultShareStatus('Preparing result image...');
    setIsSharingResult(true);

    try {
      const imageBlob = await createResultPosterPng(firstPlace, secondPlace, thirdPlace);
      const filename = `roomingkos-result-${new Date().toISOString().slice(0, 10)}.png`;
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
            title: 'RoomingKos Tournament Result',
            text: 'Table tennis tournament result poster',
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

      if (
        window.isSecureContext &&
        navigator.clipboard &&
        'ClipboardItem' in window
      ) {
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

  return (
    <>
      <AdminGateModal 
        visible={showAdminGate} 
        onClose={() => setShowAdminGate(false)} 
        onSuccess={handleAdminLoginSuccess} 
      />
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
        title={scoreDialog?.title || 'Match'}
        leftPlayerName={scoreDialog?.leftPlayerName || ''}
        rightPlayerName={scoreDialog?.rightPlayerName || ''}
        initialScore={scoreDialog ? tournament.matchScores[scoreDialog.scoreKey] : undefined}
        onClose={() => setScoreDialog(null)}
        onSubmit={handleSubmitScore}
      />
      <ClickParticles />
      {stamps.map((stamp) => (
        <div 
          key={stamp.id} 
          className="stamp-winner" 
          style={{ left: stamp.x, top: stamp.y }}
        >
          WINNER
        </div>
      ))}
      <CelebrationLayer
        canvasRef={celebration.canvasRef}
        championName={celebration.championName}
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
        <PageOrnaments />
        <HeroHeader
          currentView={currentView}
          shareStatus={tournament.shareStatus}
          onShare={tournament.shareEvent}
          onViewChange={handleViewChange}
        />
        <EventSummary
          showAdminControls={currentView === 'admin'}
          isAdminMode={isAdminMode}
          canUseAdminControls={canUseAdminControls}
          onLogin={() => setShowAdminGate(true)}
          onLogout={handleAdminLogout}
          onReset={tournament.resetEvent}
        />
        <CapacityGauge
          playerCount={tournament.players.length}
          maxPlayers={MAX_PLAYERS}
          waitlistCount={tournament.waitingPlayers.length}
        />

        <div className={`content${currentView !== 'admin' ? ' content-single' : ''}`}>
          <div className="view-column">
            {currentView === 'warriors' ? (
              <div className="view-panel view-slot-grid warriors-layout" role="tabpanel">
                <RegistrationPanel
                  buttonText={tournament.shouldQueueSignup ? 'Join Waitlist' : 'Add Participant'}
                  disabled={tournament.isShufflingRoster}
                  onSubmit={tournament.submitParticipant}
                />
                <EntriesPanel
                  players={tournament.players}
                  waitingPlayers={tournament.waitingPlayers}
                  countText={countText}
                  canDelete={false}
                  onDeletePlayer={tournament.deleteParticipant}
                  onDeleteWaitingPlayer={tournament.deleteWaitingParticipant}
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
                    onDeletePlayer={tournament.deleteParticipant}
                    onDeleteWaitingPlayer={tournament.deleteWaitingParticipant}
                    getProfileHandlers={profileCard.getProfileHandlers}
                  />
                </div>
              </section>
            )}
          </div>

          {currentView === 'admin' ? (
            <>
              <BracketPanel
                players={tournament.players}
                rosterOrder={tournament.rosterOrder}
                matchScores={tournament.matchScores}
                matchWinners={tournament.matchWinners}
                isRosterFinalized={tournament.isRosterFinalized}
                isShufflingRoster={tournament.isShufflingRoster}
                canUseRosterControls={canUseRosterControls}
                isBracketFocus={isBracketFocus}
                getProfileHandlers={profileCard.getProfileHandlers}
                onDrawRoster={tournament.drawRoster}
                onToggleFocus={() => {
                  profileCard.hideProfileCard(true);
                  setIsBracketFocus((current) => !current);
                }}
                canUndoLastResult={canUseRosterControls && tournament.matchHistory.length > 0}
                onUndoLastResult={handleUndoLastResult}
                resultsReady={resultsReady}
                onOpenResults={() => setShowPodium(true)}
                onRequestMatchScore={handleRequestMatchScore}
                onRequestThirdPlaceScore={handleRequestThirdPlaceScore}
                onScroll={() => profileCard.hideProfileCard(true)}
              />
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
