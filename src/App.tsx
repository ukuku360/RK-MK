import { startTransition, useEffect, useMemo, useState } from 'react';
import { ADMIN_PASSWORD, ADMIN_SESSION_KEY, MAX_PLAYERS } from './constants';
import { BracketPanel } from './components/BracketPanel';
import { CelebrationLayer } from './components/CelebrationLayer';
import { EntriesPanel } from './components/EntriesPanel';
import { EventSummary } from './components/EventSummary';
import { CapacityGauge } from './components/CapacityGauge';
import { HeroHeader } from './components/HeroHeader';
import { PageOrnaments } from './components/PageOrnaments';
import { ProfileCard } from './components/ProfileCard';
import { RegistrationPanel } from './components/RegistrationPanel';
import { RoomingKosMotionPreview } from './components/RoomingKosMotionPreview';
import { useCelebration } from './hooks/useCelebration';
import { useProfileCard } from './hooks/useProfileCard';
import { useTournamentEvent } from './hooks/useTournamentEvent';
import { ClickParticles } from './components/ClickParticles';
import { AdminGateModal } from './components/AdminGateModal';
import { PodiumPopup } from './components/PodiumPopup';
import { getBracketEntrants, getResolvedMatchWinner } from './utils/bracket';
import { THIRD_PLACE_KEY } from './constants';
import type { ViewMode } from './types';

function getRosterStatusText(options: {
  isShufflingRoster: boolean;
  isRosterFinalized: boolean;
  playerCount: number;
  waitlistCount: number;
  isFirebaseAvailable: boolean;
}) {
  const {
    isShufflingRoster,
    isRosterFinalized,
    playerCount,
    waitlistCount,
    isFirebaseAvailable,
  } = options;

  if (isShufflingRoster) {
    return 'Drawing roster now. The final matchups will be set shortly.';
  }

  if (isRosterFinalized) {
    const emptySlotCount = Math.max(0, MAX_PLAYERS - playerCount);

    if (waitlistCount) {
      return `Roster is active. ${waitlistCount} player${waitlistCount === 1 ? '' : 's'} ${
        waitlistCount === 1 ? 'remains' : 'remain'
      } on the waitlist.`;
    }

    if (emptySlotCount > 0) {
      return `Roster is active. ${emptySlotCount} bracket slot${
        emptySlotCount === 1 ? ' is' : 's are'
      } empty and will advance by bye. New signups now go to the waitlist.`;
    }

    return 'Roster is active. New signups now go to the waitlist.';
  }

  if (playerCount < 2) {
    return 'At least 2 participants are needed to draw a roster.';
  }

  if (playerCount < MAX_PLAYERS) {
    return `${playerCount} of ${MAX_PLAYERS} slots filled. You can draw now or wait for more participants.`;
  }

  if (waitlistCount) {
    return `All ${MAX_PLAYERS} slots are filled. ${waitlistCount} player${
      waitlistCount === 1 ? '' : 's'
    } ${waitlistCount === 1 ? 'is' : 'are'} waiting for an opening.`;
  }

  if (!isFirebaseAvailable) {
    return 'Running in local mode. Configure Firebase to sync this bracket across devices.';
  }

  return 'All participants are in. New signups now go to the waitlist.';
}

export default function App() {
  const tournament = useTournamentEvent();
  const profileCard = useProfileCard();
  const celebration = useCelebration();

  const [currentView, setCurrentView] = useState<ViewMode>('warriors');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [showPodium, setShowPodium] = useState(false);
  const [isBracketFocus, setIsBracketFocus] = useState(
    () => document.body.classList.contains('bracket-focus'),
  );
  const [stamps, setStamps] = useState<{ id: number; x: number; y: number }[]>([]);

  const canUseAdminControls = isAdminMode && currentView === 'admin';
  const canUseRosterControls = isAdminMode;

  const countText = useMemo(() => {
    if (tournament.isRosterFull) {
      return `Entries: ${tournament.players.length} / ${MAX_PLAYERS} (full)`;
    }

    return `Entries: ${tournament.players.length} / ${MAX_PLAYERS}`;
  }, [tournament.isRosterFull, tournament.players.length]);

  const rosterStatus = useMemo(
    () =>
      getRosterStatusText({
        isShufflingRoster: tournament.isShufflingRoster,
        isRosterFinalized: tournament.isRosterFinalized,
        playerCount: tournament.players.length,
        waitlistCount: tournament.waitingPlayers.length,
        isFirebaseAvailable: tournament.isFirebaseAvailable,
      }),
    [
      tournament.isFirebaseAvailable,
      tournament.isRosterFinalized,
      tournament.isShufflingRoster,
      tournament.players.length,
      tournament.waitingPlayers.length,
    ],
  );

  useEffect(() => {
    document.body.classList.toggle('bracket-focus', isBracketFocus);

    return () => {
      document.body.classList.remove('bracket-focus');
    };
  }, [isBracketFocus]);

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
    profileCard.hideProfileCard(true);
    startTransition(() => setCurrentView('warriors'));
  }

  function handleSelectWinner(
    childLevel: number,
    childMatchIndex: number,
    winnerEntrantIndex: number,
    clientX?: number,
    clientY?: number,
  ) {
    profileCard.hideProfileCard(true);
    const result = tournament.selectWinner(childLevel, childMatchIndex, winnerEntrantIndex);

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

  function handleSelectThirdPlaceWinner(
    winnerEntrantIndex: number,
    clientX?: number,
    clientY?: number,
  ) {
    profileCard.hideProfileCard(true);
    const result = tournament.selectThirdPlaceWinner(winnerEntrantIndex);

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

  const entrants = getBracketEntrants(tournament.players, tournament.rosterOrder, tournament.isRosterFinalized);
  const leftFinalistIndex = getResolvedMatchWinner(3, 0, entrants, tournament.matchWinners);
  const rightFinalistIndex = getResolvedMatchWinner(3, 1, entrants, tournament.matchWinners);
  const secondPlaceIndex = tournament.championIndex === leftFinalistIndex ? rightFinalistIndex : leftFinalistIndex;

  const firstPlace = tournament.championIndex !== undefined ? entrants[tournament.championIndex] : undefined;
  const secondPlace = secondPlaceIndex !== undefined ? entrants[secondPlaceIndex] : undefined;
  const thirdPlace = tournament.matchWinners[THIRD_PLACE_KEY] !== undefined ? entrants[tournament.matchWinners[THIRD_PLACE_KEY]] : undefined;

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
              matchWinners={tournament.matchWinners}
              isRosterFinalized={tournament.isRosterFinalized}
              isShufflingRoster={tournament.isShufflingRoster}
              canUseRosterControls={canUseRosterControls}
              rosterStatus={rosterStatus}
              isBracketFocus={isBracketFocus}
              getProfileHandlers={profileCard.getProfileHandlers}
              onDrawRoster={tournament.drawRoster}
              onToggleFocus={() => {
                profileCard.hideProfileCard(true);
                setIsBracketFocus((current) => !current);
              }}
              onSelectWinner={handleSelectWinner}
              onSelectThirdPlaceWinner={handleSelectThirdPlaceWinner}
              onScroll={() => profileCard.hideProfileCard(true)}
            />
            {tournament.championIndex !== undefined && (
              <button 
                type="button" 
                onClick={() => setShowPodium(true)}
                style={{
                  position: 'fixed', bottom: '24px', right: '24px', zIndex: 100,
                  background: 'var(--brand)', color: '#fff', padding: '12px 24px',
                  borderRadius: '999px', border: '4px solid var(--black)',
                  fontSize: '18px',
                  fontWeight: 900, boxShadow: '6px 6px 0 var(--black)',
                  cursor: 'pointer', transition: 'transform 0.1s'
                }}
              >
                🏆 VIEW PODIUM
              </button>
            )}
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
