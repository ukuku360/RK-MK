import type { ComponentProps, MouseEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { EVENT_PRESET } from '../constants';
import type { ProfileHandlerFactory } from '../hooks/useProfileCard';
import type {
  EventPreset,
  PlayerRecord,
  StageRaceSlot,
  StageKey,
  TournamentStage,
} from '../types';
import { makeProfileCardData } from '../utils/profile';

interface BracketPanelProps {
  entrants: PlayerRecord[];
  groupStages: TournamentStage[];
  finalStage: TournamentStage;
  completedStandardRaceCount: number;
  totalStandardRaceCount: number;
  completedTieBreakCount: number;
  isRosterFinalized: boolean;
  isShufflingRoster: boolean;
  canUseRosterControls: boolean;
  isBracketFocus: boolean;
  preset?: EventPreset;
  getProfileHandlers: ProfileHandlerFactory;
  onDrawRoster: () => void;
  onToggleFocus: () => void;
  canUndoLastResult: boolean;
  onUndoLastResult: () => void;
  resultsReady: boolean;
  onOpenResults: () => void;
  onRequestRaceResult: (
    slot: StageRaceSlot,
    clientX?: number,
    clientY?: number,
  ) => void;
  onOpenStageFocus?: () => void;
  onScroll: () => void;
}

function getStageStatusText(stage: TournamentStage, isRosterFinalized: boolean) {
  if (!isRosterFinalized) {
    return 'Draw the groups to lock the field.';
  }

  if (stage.participantIndexes.length === 0) {
    return 'No drivers assigned.';
  }

  if (!stage.isReady) {
    return 'Waiting for the groups to finish.';
  }

  if (stage.participantIndexes.length === 1) {
    return 'Auto-qualified with no ranking needed.';
  }

  if (stage.isFinalized) {
    return stage.key === 'final' ? 'Final ranking locked.' : 'Finalist locked for the final.';
  }

  return 'Enter the final ranking.';
}

function getWinnerLabel(stage: TournamentStage, entrants: PlayerRecord[]) {
  if (stage.winnerIndex === undefined) {
    return null;
  }

  const winner = entrants[stage.winnerIndex];
  const label = winner && !winner.empty ? winner.name : 'TBD';

  return stage.key === 'final' ? `Champion · ${label}` : `Finalist · ${label}`;
}

const INTERACTIVE_STAGE_CARD_SELECTOR =
  'button, a, input, select, textarea, [data-stage-card-action="true"], [data-profile-card-anchor="true"]';

interface StageCardProps {
  entrants: PlayerRecord[];
  stage: TournamentStage;
  isRosterFinalized: boolean;
  canUseRosterControls: boolean;
  isExpanded?: boolean;
  titleId?: string;
  getProfileHandlers: ProfileHandlerFactory;
  onOpenFocus?: (stageKey: StageKey) => void;
  onRequestRaceResult: (
    slot: StageRaceSlot,
    clientX?: number,
    clientY?: number,
  ) => void;
}

function StageCard({
  entrants,
  stage,
  isRosterFinalized,
  canUseRosterControls,
  isExpanded = false,
  titleId,
  getProfileHandlers,
  onOpenFocus,
  onRequestRaceResult,
}: StageCardProps) {
  const winnerLabel = getWinnerLabel(stage, entrants);
  const canOpenFocus = !isExpanded && Boolean(onOpenFocus);
  const className = `stage-card${stage.key === 'final' ? ' stage-card-final' : ''}${
    isExpanded ? ' stage-card-expanded' : ' stage-card-focusable'
  }`;

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    if (!canOpenFocus) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;

    if (target?.closest(INTERACTIVE_STAGE_CARD_SELECTOR)) {
      return;
    }

    onOpenFocus?.(stage.key);
  }

  return (
    <article className={className} onClick={handleCardClick}>
      <div className="stage-card-header">
        <div>
          <p className="stage-card-kicker">
            {stage.key === 'final' ? 'Championship' : 'Qualifier'}
          </p>
          <h3 id={titleId}>{stage.title}</h3>
        </div>
        {winnerLabel || canOpenFocus ? (
          <div className="stage-card-header-actions">
            {winnerLabel ? (
              <span className="stage-card-winner">{winnerLabel}</span>
            ) : null}
            {canOpenFocus ? (
              <button
                type="button"
                className="stage-card-focus-button"
                data-stage-card-action="true"
                aria-label={`Open ${stage.title} focus view`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenFocus?.(stage.key);
                }}
              >
                Focus
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="stage-card-status">{getStageStatusText(stage, isRosterFinalized)}</p>

      <div className="stage-player-grid">
        {stage.participantIndexes.length === 0 ? (
          <div className="stage-empty-note">No drivers locked into this stage yet.</div>
        ) : (
          stage.participantIndexes.map((entrantIndex, index) => {
            const player = entrants[entrantIndex];
            const profileHandlers = getProfileHandlers(
              makeProfileCardData(
                player,
                stage.key === 'final'
                  ? `Finalist ${index + 1}`
                  : `${stage.title} Driver ${index + 1}`,
              ),
              { enablePin: true },
            ) as ComponentProps<'button'>;

            return (
              <button
                key={`${stage.key}-entrant-${entrantIndex}`}
                type="button"
                className="stage-player-chip"
                data-profile-card-anchor="true"
                {...profileHandlers}
              >
                {player && !player.empty ? player.name : 'TBD'}
              </button>
            );
          })
        )}
      </div>

      <div className="stage-card-body">
        <section className="stage-race-panel" aria-label={`${stage.title} ranking input`}>
          <div className="stage-section-heading">
            <h4>Ranking</h4>
            <span>
              {stage.completedStandardRaceCount} / {stage.totalStandardRaceCount}
            </span>
          </div>

          {stage.raceSlots.length === 0 ? (
            <p className="stage-empty-note">
              {stage.participantIndexes.length <= 1
                ? 'No ranking input needed.'
                : 'Ranking input will appear once the stage is ready.'}
            </p>
          ) : (
            <div className="stage-race-list">
              {stage.raceSlots.map((slot) => (
                <button
                  key={slot.key}
                  type="button"
                  className={`stage-race-row${slot.result ? ' resolved' : ''}${slot.isLocked ? ' locked' : ''}${slot.isPending ? ' pending' : ''}`}
                  disabled={!canUseRosterControls || slot.isLocked}
                  onClick={(event) =>
                    onRequestRaceResult(slot, event.clientX, event.clientY)
                  }
                >
                  <span className="stage-race-label-wrap">
                    <span className="stage-race-label">{slot.label}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="stage-standings-panel" aria-label={`${stage.title} standings`}>
          <div className="stage-section-heading">
            <h4>Rankings</h4>
            <span>Rank</span>
          </div>

          {stage.standings.length === 0 ? (
            <p className="stage-empty-note">Rankings will populate after the draw.</p>
          ) : (
            <div className="stage-standings-table">
              {stage.standings.map((standing) => {
                const player = entrants[standing.entrantIndex];
                const profileHandlers = getProfileHandlers(
                  makeProfileCardData(
                    player,
                    stage.key === 'final'
                      ? `Final Rank ${standing.rank}`
                      : `${stage.title} Rank ${standing.rank}`,
                  ),
                  { enablePin: true },
                ) as ComponentProps<'button'>;
                return (
                  <div
                    key={`${stage.key}-standing-${standing.entrantIndex}`}
                    className={`stage-standing-row${standing.rank === 1 ? ' stage-standing-row-top' : ''}`}
                  >
                    <span className="stage-standing-rank">#{standing.rank}</span>
                    <button
                      type="button"
                      className="stage-standing-name"
                      data-profile-card-anchor="true"
                      {...profileHandlers}
                    >
                      {player && !player.empty ? player.name : 'TBD'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </article>
  );
}

export function BracketPanel({
  entrants,
  groupStages,
  finalStage,
  completedStandardRaceCount,
  totalStandardRaceCount,
  isRosterFinalized,
  isShufflingRoster,
  canUseRosterControls,
  isBracketFocus,
  preset = EVENT_PRESET,
  getProfileHandlers,
  onDrawRoster,
  onToggleFocus,
  canUndoLastResult,
  onUndoLastResult,
  resultsReady,
  onOpenResults,
  onRequestRaceResult,
  onOpenStageFocus,
  onScroll,
}: BracketPanelProps) {
  const [selectedStageKey, setSelectedStageKey] = useState<StageKey | null>(null);
  const stages = useMemo(
    () => [...groupStages, finalStage],
    [finalStage, groupStages],
  );
  const selectedStage = useMemo(
    () => stages.find((stage) => stage.key === selectedStageKey) ?? null,
    [selectedStageKey, stages],
  );
  const activeEntrantCount = useMemo(
    () => entrants.filter((entrant) => entrant && !entrant.empty).length,
    [entrants],
  );
  const drawButtonDisabled = !canUseRosterControls || isShufflingRoster || activeEntrantCount < 2;
  const drawButtonText = isShufflingRoster ? 'Drawing Groups...' : 'Draw Groups';
  const progressWidth =
    totalStandardRaceCount === 0
      ? '0%'
      : `max(${((completedStandardRaceCount / totalStandardRaceCount) * 100).toFixed(2)}%, 26px)`;

  useEffect(() => {
    if (!selectedStageKey) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (document.querySelector('.match-score-modal-backdrop')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setSelectedStageKey(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedStageKey]);

  function openStageFocus(stageKey: StageKey) {
    onOpenStageFocus?.();
    setSelectedStageKey(stageKey);
  }

  function closeStageFocus() {
    setSelectedStageKey(null);
  }

  return (
    <section className="panel bracket-panel">
      <div className="bracket-header">
        <div>
          <h2 className="bracket-title">{preset.bracketHeading}</h2>
        </div>
        <div className="bracket-controls">
          <button
            type="button"
            className="draw-toggle"
            aria-live="polite"
            disabled={drawButtonDisabled}
            onClick={onDrawRoster}
          >
            {drawButtonText}
          </button>
          <button
            type="button"
            className="focus-toggle"
            aria-pressed={isBracketFocus}
            onClick={onToggleFocus}
          >
            {isBracketFocus ? 'Back to normal view' : 'Enlarge Stage Board'}
          </button>
        </div>
      </div>

      <section className="bracket-progress-panel" aria-label="Stage progress">
        <div className="bracket-progress-top">
          <div className="bracket-progress-copy">
            <h3 className="bracket-progress-title">
              {completedStandardRaceCount} / {totalStandardRaceCount}
            </h3>
            <p className="bracket-progress-note">rankings locked</p>
          </div>
          <div className="bracket-progress-meta">
            <span className="bracket-progress-badge">
              Direct rankings
            </span>
            {canUndoLastResult ? (
              <button
                type="button"
                className="bracket-progress-undo"
                onClick={onUndoLastResult}
              >
                Undo
              </button>
            ) : null}
          </div>
        </div>
        <div className="bracket-progress-bar" aria-hidden="true">
          <div
            className="bracket-progress-bar-fill"
            style={{ width: progressWidth }}
          >
            <span className="bracket-progress-ball-shadow" />
            <span className="bracket-progress-ball" />
          </div>
        </div>
      </section>

      <div className="bracket-stage">
        <div className="bracket-shell" onScroll={onScroll}>
          <div className={`shuffle-overlay${isShufflingRoster ? ' visible' : ''}`} aria-hidden={!isShufflingRoster}>
            <div className="shuffle-orbit" />
            <div className="shuffle-text">Drawing groups...</div>
            <p className="shuffle-subtext">
              Drivers are being randomized and the final stage flow will be locked.
            </p>
          </div>

          <div className="stage-board-grid">
            {stages.map((stage) => (
              <StageCard
                key={stage.key}
                entrants={entrants}
                stage={stage}
                isRosterFinalized={isRosterFinalized}
                canUseRosterControls={canUseRosterControls}
                getProfileHandlers={getProfileHandlers}
                onOpenFocus={openStageFocus}
                onRequestRaceResult={onRequestRaceResult}
              />
            ))}
          </div>
        </div>

        {resultsReady ? (
          <button
            type="button"
            className="bracket-result-tab"
            onClick={onOpenResults}
            aria-label="Open podium results"
          >
            <span className="bracket-result-kicker">Podium</span>
          </button>
        ) : null}
      </div>

      {selectedStage ? (
        <div
          className="stage-focus-modal-backdrop"
          role="presentation"
          onClick={closeStageFocus}
        >
          <section
            className="stage-focus-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`stage-focus-title-${selectedStage.key}`}
            onClick={(event) => event.stopPropagation()}
            onScroll={onScroll}
          >
            <div className="stage-focus-modal-top">
              <p className="stage-focus-modal-kicker">Focused Stage</p>
              <button
                type="button"
                className="stage-focus-modal-close"
                onClick={closeStageFocus}
                aria-label="Close focused stage"
              >
                Close
              </button>
            </div>
            <StageCard
              entrants={entrants}
              stage={selectedStage}
              isRosterFinalized={isRosterFinalized}
              canUseRosterControls={canUseRosterControls}
              isExpanded
              titleId={`stage-focus-title-${selectedStage.key}`}
              getProfileHandlers={getProfileHandlers}
              onRequestRaceResult={onRequestRaceResult}
            />
          </section>
        </div>
      ) : null}
    </section>
  );
}
