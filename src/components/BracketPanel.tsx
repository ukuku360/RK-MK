import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import {
  BOTTOM_PADDING,
  MAX_PLAYERS,
  NODE_HEIGHT,
  NODE_WIDTH,
  ROW_GAP,
  SLOT_GAP,
  THIRD_PLACE_KEY,
  THIRD_PLACE_PANEL_GAP,
  THIRD_PLACE_PANEL_WIDTH,
  TOP_PADDING,
  X_PADDING,
} from '../constants';
import type { ProfileHandlerFactory } from '../hooks/useProfileCard';
import type {
  MatchScores,
  MatchWinners,
  PlayerRecord,
  RosterEntry,
} from '../types';
import {
  createEmptyBracketEntrant,
  getBracketEntrants,
  getFourthPlaceIndex,
  getMatchParticipantIndexes,
  getMatchResolution,
  getResolvedMatchWinner,
  getThirdPlaceEntrantIndexes,
  getWinnerKey,
} from '../utils/bracket';
import { makeProfileCardData } from '../utils/profile';
import { shortenPlayerName } from '../utils/text';

interface BracketPanelProps {
  players: PlayerRecord[];
  rosterOrder: RosterEntry[];
  matchScores: MatchScores;
  matchWinners: MatchWinners;
  isRosterFinalized: boolean;
  isShufflingRoster: boolean;
  canUseRosterControls: boolean;
  isBracketFocus: boolean;
  getProfileHandlers: ProfileHandlerFactory;
  onDrawRoster: () => void;
  onToggleFocus: () => void;
  canUndoLastResult: boolean;
  onUndoLastResult: () => void;
  resultsReady: boolean;
  onOpenResults: () => void;
  onRequestMatchScore: (
    matchLevel: number,
    matchIndex: number,
    clientX?: number,
    clientY?: number,
  ) => void;
  onRequestThirdPlaceScore: (
    clientX?: number,
    clientY?: number,
  ) => void;
  onScroll: () => void;
}

interface Connector {
  d: string;
  className: string;
}

interface RenderNode {
  key: string;
  x: number;
  y: number;
  textPrimary: string;
  textMeta: string;
  isLeaf: boolean;
  isEmpty: boolean;
  className: string;
  profileData: ReturnType<typeof makeProfileCardData>;
}

interface RenderMatchControl {
  key: string;
  x: number;
  y: number;
  label: string;
  detail?: string;
  variant?: 'default' | 'bye';
  className: string;
  action?:
    | {
        kind: 'match-score';
        matchLevel: number;
        matchIndex: number;
      }
    | {
        kind: 'third-place-score';
      };
}

interface PlacementPanelData {
  x: number;
  y: number;
  width: number;
  height: number;
  playoffReady: boolean;
  canControl: boolean;
}

function buildConnectorPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  className = 'line',
): Connector {
  const x1 = from.x;
  const y1 = from.y + NODE_HEIGHT / 2;
  const x2 = to.x;
  const y2 = to.y - NODE_HEIGHT / 2;
  const midY = (y1 + y2) / 2;

  return {
    d: `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`,
    className,
  };
}

export function BracketPanel({
  players,
  rosterOrder,
  matchScores,
  matchWinners,
  isRosterFinalized,
  isShufflingRoster,
  canUseRosterControls,
  isBracketFocus,
  getProfileHandlers,
  onDrawRoster,
  onToggleFocus,
  canUndoLastResult,
  onUndoLastResult,
  resultsReady,
  onOpenResults,
  onRequestMatchScore,
  onRequestThirdPlaceScore,
  onScroll,
}: BracketPanelProps) {
  const {
    completedMatchCount,
    connectors,
    matchControls,
    nodes,
    placementPanel,
    progressPercent,
    svgHeight,
    svgWidth,
  } = useMemo(() => {
    const sourceEntrants = getBracketEntrants(players, rosterOrder, isRosterFinalized);
    const entrants = [...sourceEntrants];

    while (entrants.length < MAX_PLAYERS) {
      entrants.push(createEmptyBracketEntrant());
    }

    const rounds = [16, 8, 4, 2, 1];
    const levelNodes: Array<Array<{ x: number; y: number; isLeaf: boolean; isEmpty: boolean; name?: string }>> = [];
    const nextConnectors: Connector[] = [];
    const nextMatchControls: RenderMatchControl[] = [];
    const nextNodes: RenderNode[] = [];
    const canControl = isRosterFinalized && canUseRosterControls;
    const slotSpacing = NODE_WIDTH + SLOT_GAP;
    const baseSvgWidth = X_PADDING * 2 + slotSpacing * (MAX_PLAYERS - 1);
    const previewThirdPlaceEntrants = getThirdPlaceEntrantIndexes(entrants, matchWinners);
    const showThirdPlacePanel =
      [0, 1].some(
        (matchIndex) =>
          getMatchParticipantIndexes(3, matchIndex, entrants, matchWinners).length === 2,
      ) ||
      previewThirdPlaceEntrants.some((entrantIndex) => entrantIndex !== undefined) ||
      matchWinners[THIRD_PLACE_KEY] !== undefined ||
      matchScores[THIRD_PLACE_KEY] !== undefined;
    const resolvedSvgWidth =
      baseSvgWidth + (showThirdPlacePanel ? THIRD_PLACE_PANEL_GAP + THIRD_PLACE_PANEL_WIDTH : 0);
    const resolvedSvgHeight = TOP_PADDING + ROW_GAP * (rounds.length - 1) + BOTTOM_PADDING;
    const yBottom = TOP_PADDING + ROW_GAP * (rounds.length - 1);
    const totalMatchCount = 16;
    let nextCompletedMatchCount = 0;

    for (let levelIndex = 1; levelIndex < rounds.length; levelIndex += 1) {
      for (let matchIndex = 0; matchIndex < rounds[levelIndex]; matchIndex += 1) {
        const resolution = getMatchResolution(levelIndex, matchIndex, entrants, matchWinners);

        if (resolution.state === 'resolved') {
          nextCompletedMatchCount += 1;
        }
      }
    }

    if (matchWinners[THIRD_PLACE_KEY] !== undefined) {
      nextCompletedMatchCount += 1;
    }

    levelNodes[0] = entrants.slice(0, 16).map((player, index) => ({
      x: X_PADDING + slotSpacing * index,
      y: yBottom,
      name: player.empty ? 'BYE' : `${index + 1}. ${shortenPlayerName(player.name, 12)}`,
      isLeaf: true,
      isEmpty: Boolean(player.empty),
    }));

    for (let levelIndex = 1; levelIndex < rounds.length; levelIndex += 1) {
      const previousLevel = levelNodes[levelIndex - 1];
      const count = rounds[levelIndex];
      const currentLevel = [];

      for (let index = 0; index < count; index += 1) {
        const leftNode = previousLevel[index * 2];
        const rightNode = previousLevel[index * 2 + 1];

        currentLevel.push({
          x: (leftNode.x + rightNode.x) / 2,
          y: yBottom - ROW_GAP * levelIndex,
          isLeaf: false,
          isEmpty: leftNode.isEmpty && rightNode.isEmpty,
        });
      }

      levelNodes[levelIndex] = currentLevel;
    }

    for (let levelIndex = rounds.length - 1; levelIndex > 0; levelIndex -= 1) {
      const currentLevel = levelNodes[levelIndex];
      const previousLevel = levelNodes[levelIndex - 1];

      currentLevel.forEach((node, index) => {
        const leftNode = previousLevel[index * 2];
        const rightNode = previousLevel[index * 2 + 1];
        nextConnectors.push(buildConnectorPath(leftNode, node));
        nextConnectors.push(buildConnectorPath(rightNode, node));
      });
    }

    for (let levelIndex = 1; levelIndex < rounds.length; levelIndex += 1) {
      const currentLevel = levelNodes[levelIndex];
      const previousLevel = levelNodes[levelIndex - 1];

      currentLevel.forEach((node, index) => {
        const leftNode = previousLevel[index * 2];
        const participantIndexes = getMatchParticipantIndexes(
          levelIndex,
          index,
          entrants,
          matchWinners,
        );
        const score = matchScores[getWinnerKey(levelIndex, index)];
        const resolution = getMatchResolution(levelIndex, index, entrants, matchWinners);
        const isPlayable = participantIndexes.length === 2;

        if (!isPlayable && !score) {
          return;
        }

        const y1 = leftNode.y + NODE_HEIGHT / 2;
        const y2 = node.y - NODE_HEIGHT / 2;
        const isByeResolved = resolution.state === 'resolved' && resolution.decidedBy === 'bye';
        const label =
          score
            ? `${score.left} - ${score.right}`
            : isByeResolved
              ? 'BYE'
              : 'Score';

        nextMatchControls.push({
          key: `match-control-${levelIndex}-${index}`,
          x: node.x,
          y: (y1 + y2) / 2,
          label,
          detail: isByeResolved ? 'AUTO ADVANCE' : undefined,
          variant: isByeResolved ? 'bye' : 'default',
          className: [
            'match-control',
            isByeResolved ? 'match-control-bye' : '',
            isPlayable && canControl ? 'match-control-clickable' : '',
            score ? 'match-control-resolved' : '',
          ]
            .filter(Boolean)
            .join(' '),
          action:
            isPlayable && canControl
              ? {
                  kind: 'match-score',
                  matchLevel: levelIndex,
                  matchIndex: index,
                }
              : undefined,
        });
      });
    }

    levelNodes.forEach((level, levelIndex) => {
      level.forEach((node, nodeIndex) => {
        let textPrimary = '';
        let textMeta = '';
        let isWinnerNode = false;
        let isLoserNode = false;
        let isChampionNode = false;
        let profileData: ReturnType<typeof makeProfileCardData> = null;

        if (node.isLeaf) {
          textPrimary = node.name || '';
          profileData = makeProfileCardData(entrants[nodeIndex], `Slot ${nodeIndex + 1}`);

          if (!node.isEmpty && isRosterFinalized) {
            const parentWinner = getResolvedMatchWinner(
              1,
              Math.floor(nodeIndex / 2),
              entrants,
              matchWinners,
            );

            if (parentWinner === nodeIndex) {
              isWinnerNode = true;
            } else if (parentWinner !== undefined) {
              isLoserNode = true;
            }
          }
        } else if (levelIndex === 4) {
          const championIndex = getResolvedMatchWinner(4, 0, entrants, matchWinners);

          if (championIndex !== undefined) {
            const champion = entrants[championIndex];

            if (champion && !champion.empty) {
              textPrimary = shortenPlayerName(champion.name, 12);
              isChampionNode = true;
              profileData = makeProfileCardData(champion, 'Champion');
            } else {
              textPrimary = 'Champion';
            }
          } else {
            textPrimary = 'Champion';
          }
        } else {
          const winnerIndex = getResolvedMatchWinner(levelIndex, nodeIndex, entrants, matchWinners);

          if (winnerIndex !== undefined) {
            const winner = entrants[winnerIndex];
            textPrimary = winner && !winner.empty ? shortenPlayerName(winner.name, 12) : '?';
            profileData = makeProfileCardData(
              winner,
              levelIndex === 1
                ? 'Round 1 Winner'
                : levelIndex === 2
                  ? 'Quarterfinal Winner'
                  : 'Finalist',
            );

            const parentWinner = getResolvedMatchWinner(
              levelIndex + 1,
              Math.floor(nodeIndex / 2),
              entrants,
              matchWinners,
            );

            if (parentWinner === winnerIndex) {
              isWinnerNode = true;
            } else if (parentWinner !== undefined) {
              isLoserNode = true;
            }
          } else {
            textPrimary = '?';
          }
        }

        const classNames = [
          isWinnerNode ? 'node-winner' : '',
          isLoserNode ? 'node-loser' : '',
          isChampionNode ? 'node-champion' : '',
          profileData ? 'node-profileable' : '',
        ]
          .filter(Boolean)
          .join(' ');

        nextNodes.push({
          key: `${levelIndex}-${nodeIndex}`,
          x: node.x,
          y: node.y,
          textPrimary,
          textMeta,
          isLeaf: node.isLeaf,
          isEmpty: node.isEmpty,
          className: classNames,
          profileData,
        });
      });
    });

    let nextPlacementPanel: PlacementPanelData | null = null;

    if (showThirdPlacePanel) {
      const thirdPlacePanelX = baseSvgWidth + THIRD_PLACE_PANEL_GAP;
      const thirdPlacePanelY = TOP_PADDING + 12;
      const thirdPlacePanelHeight = resolvedSvgHeight - thirdPlacePanelY - (BOTTOM_PADDING - 8);
      const thirdPlaceCenterX = thirdPlacePanelX + THIRD_PLACE_PANEL_WIDTH / 2;
      const thirdPlaceWinnerNode = { x: thirdPlaceCenterX, y: thirdPlacePanelY + 128 };
      const thirdPlaceLoserNodes = [
        { x: thirdPlacePanelX + 106, y: thirdPlacePanelY + 286 },
        { x: thirdPlacePanelX + THIRD_PLACE_PANEL_WIDTH - 106, y: thirdPlacePanelY + 286 },
      ];
      const fourthPlaceNode = { x: thirdPlaceCenterX, y: thirdPlacePanelY + 418 };
      const thirdPlaceEntrants = previewThirdPlaceEntrants;
      const playoffReady = thirdPlaceEntrants.every((entrantIndex) => entrantIndex !== undefined);
      const rawThirdPlaceWinnerIndex = matchWinners[THIRD_PLACE_KEY];
      const thirdPlaceWinnerIndex = thirdPlaceEntrants.includes(rawThirdPlaceWinnerIndex)
        ? rawThirdPlaceWinnerIndex
        : undefined;
      const fourthPlaceIndex = getFourthPlaceIndex(thirdPlaceWinnerIndex, entrants, matchWinners);

      nextPlacementPanel = {
        x: thirdPlacePanelX,
        y: thirdPlacePanelY,
        width: THIRD_PLACE_PANEL_WIDTH,
        height: thirdPlacePanelHeight,
        playoffReady,
        canControl,
      };

      thirdPlaceLoserNodes.forEach((childNode) => {
        nextConnectors.push(buildConnectorPath(childNode, thirdPlaceWinnerNode, 'placement-line'));
      });

      if (playoffReady || matchScores[THIRD_PLACE_KEY]) {
        const thirdPlaceScore = matchScores[THIRD_PLACE_KEY];
        const y1 = thirdPlaceLoserNodes[0].y + NODE_HEIGHT / 2;
        const y2 = thirdPlaceWinnerNode.y - NODE_HEIGHT / 2;

        nextMatchControls.push({
          key: 'third-place-score-control',
          x: thirdPlaceWinnerNode.x,
          y: (y1 + y2) / 2,
          label: thirdPlaceScore ? `${thirdPlaceScore.left} - ${thirdPlaceScore.right}` : 'Score',
          className: [
            'match-control',
            canControl && playoffReady ? 'match-control-clickable' : '',
            thirdPlaceScore ? 'match-control-resolved' : '',
          ]
            .filter(Boolean)
            .join(' '),
          action: canControl && playoffReady ? { kind: 'third-place-score' } : undefined,
        });
      }

      thirdPlaceLoserNodes.forEach((childNode, index) => {
        const entrantIndex = thirdPlaceEntrants[index];
        const player = entrantIndex !== undefined ? entrants[entrantIndex] : null;
        const classNames = [
          entrantIndex !== undefined && thirdPlaceWinnerIndex === entrantIndex ? 'node-winner' : '',
          thirdPlaceWinnerIndex !== undefined &&
          entrantIndex !== undefined &&
          thirdPlaceWinnerIndex !== entrantIndex
            ? 'node-loser'
            : '',
          player ? 'node-profileable' : '',
        ]
          .filter(Boolean)
          .join(' ');

        nextNodes.push({
          key: `third-loser-${index}`,
          x: childNode.x,
          y: childNode.y,
          textPrimary:
            player && !player.empty ? shortenPlayerName(player.name, 12) : 'Semifinal loser',
          textMeta: entrantIndex !== undefined ? `Semi ${index + 1} loser` : 'Pending semifinal',
          isLeaf: false,
          isEmpty: entrantIndex === undefined,
          className: classNames,
          profileData: makeProfileCardData(player, `Semifinal ${index + 1} Loser`),
        });
      });

      {
        const player = thirdPlaceWinnerIndex !== undefined ? entrants[thirdPlaceWinnerIndex] : null;
        nextNodes.push({
          key: 'third-place-winner',
          x: thirdPlaceWinnerNode.x,
          y: thirdPlaceWinnerNode.y,
          textPrimary:
            player && !player.empty ? shortenPlayerName(player.name, 12) : '3rd Place',
          textMeta:
            thirdPlaceWinnerIndex !== undefined
              ? '3rd Place Winner'
              : playoffReady
                ? 'Playoff pending'
                : 'Waiting for semifinals',
          isLeaf: false,
          isEmpty: thirdPlaceWinnerIndex === undefined,
          className: ['node-third-place', player ? 'node-profileable' : ''].filter(Boolean).join(' '),
          profileData: makeProfileCardData(player, '3rd Place'),
        });
      }

      {
        const player = fourthPlaceIndex !== undefined ? entrants[fourthPlaceIndex] : null;
        nextNodes.push({
          key: 'fourth-place',
          x: fourthPlaceNode.x,
          y: fourthPlaceNode.y,
          textPrimary: player && !player.empty ? shortenPlayerName(player.name, 12) : '4th Place',
          textMeta:
            fourthPlaceIndex !== undefined
              ? '3rd Place Playoff Loser'
              : playoffReady
                ? 'Decided after playoff'
                : 'Waiting for semifinals',
          isLeaf: false,
          isEmpty: fourthPlaceIndex === undefined,
          className: ['node-fourth-place', player ? 'node-profileable' : ''].filter(Boolean).join(' '),
          profileData: makeProfileCardData(player, '4th Place'),
        });
      }
    }

    return {
      completedMatchCount: nextCompletedMatchCount,
      connectors: nextConnectors,
      matchControls: nextMatchControls,
      nodes: nextNodes,
      placementPanel: nextPlacementPanel,
      progressPercent: (nextCompletedMatchCount / totalMatchCount) * 100,
      svgWidth: resolvedSvgWidth,
      svgHeight: resolvedSvgHeight,
    };
  }, [canUseRosterControls, isRosterFinalized, matchScores, matchWinners, players, rosterOrder]);

  const drawButtonDisabled = !canUseRosterControls || isShufflingRoster || players.length < 2;
  const drawButtonText = isShufflingRoster ? 'Drawing...' : 'Draw Roster';
  const progressWidth =
    progressPercent === 0 ? '0%' : `max(${progressPercent.toFixed(2)}%, 26px)`;

  return (
    <section className="panel bracket-panel">
      <div className="bracket-header">
        <div>
          <h2 className="bracket-title">Bracket (16 Entrant Layout)</h2>
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
            {isBracketFocus ? 'Back to normal view' : 'Enlarge Bracket'}
          </button>
        </div>
      </div>
      <section className="bracket-progress-panel" aria-label="Bracket progress">
        <div className="bracket-progress-top">
          <div className="bracket-progress-copy">
            <h3 className="bracket-progress-title">{completedMatchCount} / 16</h3>
            <p className="bracket-progress-note">matches</p>
          </div>
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
            <div className="shuffle-orbit"></div>
            <div className="shuffle-text">Drawing roster...</div>
            <p className="shuffle-subtext">
              Players are being randomized and the final bracket will be locked.
            </p>
          </div>
          <svg
            id="bracketSvg"
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            width={svgWidth}
            height={svgHeight}
            role="img"
            aria-label="Bracket diagram"
            preserveAspectRatio="xMinYMin meet"
          >
            <g id="edges">
              {connectors.map((connector, index) => (
                <path
                  key={`${connector.className}-${index}`}
                  d={connector.d}
                  className={connector.className}
                />
              ))}
              {placementPanel ? (
                <>
                  <rect
                    x={placementPanel.x}
                    y={placementPanel.y}
                    width={placementPanel.width}
                    height={placementPanel.height}
                    rx={24}
                    className="placement-panel"
                  />
                  <text
                    x={placementPanel.x + 24}
                    y={placementPanel.y + 42}
                    className="placement-panel-title"
                  >
                    3RD PLACE PLAYOFF
                  </text>
                  <text
                    x={placementPanel.x + 24}
                    y={placementPanel.y + 68}
                    className="placement-panel-note"
                  >
                    {placementPanel.playoffReady
                      ? 'SEMIFINAL LOSERS DROP HERE.'
                      : 'OPENS ONCE BOTH SEMIFINALS ARE LOCKED.'}
                  </text>
                  <text
                    x={placementPanel.x + 24}
                    y={placementPanel.y + 88}
                    className="placement-panel-note"
                  >
                    {placementPanel.playoffReady
                      ? placementPanel.canControl
                        ? 'CLICK THE SCORE CHIP TO LOCK 3RD PLACE.'
                        : 'ADMIN LOCKS 3RD PLACE FROM THE SCORE CHIP.'
                      : 'LOSERS AUTO-DROP IN AS THE SEMIS FINISH.'}
                  </text>
                </>
              ) : null}
            </g>
            <g id="match-controls">
              {matchControls.map((control) => (
                <g
                  key={control.key}
                  className={control.className}
                  onClick={(event) => {
                    if (!control.action) {
                      return;
                    }

                    if (control.action.kind === 'match-score') {
                      onRequestMatchScore(
                        control.action.matchLevel,
                        control.action.matchIndex,
                        event.clientX,
                        event.clientY,
                      );
                      return;
                    }

                    onRequestThirdPlaceScore(event.clientX, event.clientY);
                  }}
                >
	                  <rect
	                    x={control.x - (control.variant === 'bye' ? 62 : 44)}
	                    y={control.y - (control.variant === 'bye' ? 32 : 24)}
	                    width={control.variant === 'bye' ? 124 : 88}
	                    height={control.variant === 'bye' ? 64 : 48}
	                    rx={control.variant === 'bye' ? 28 : 24}
	                    className="match-control-hitbox"
	                  />
	                  <rect
	                    x={control.x - (control.variant === 'bye' ? 52 : 34)}
	                    y={control.y - (control.variant === 'bye' ? 22 : 16)}
	                    width={control.variant === 'bye' ? 104 : 68}
	                    height={control.variant === 'bye' ? 44 : 32}
	                    rx={control.variant === 'bye' ? 22 : 16}
	                    className="match-control-pill"
	                  />
	                  <text
	                    className={`match-control-label${control.detail ? ' match-control-label-stacked' : ''}`}
	                    x={control.x}
	                    y={control.y + (control.detail ? -1 : 5)}
	                  >
	                    {control.label}
	                  </text>
                    {control.detail ? (
	                  <text className="match-control-detail" x={control.x} y={control.y + 14}>
	                    {control.detail}
	                  </text>
                    ) : null}
	                </g>
	              ))}
            </g>
            <g id="nodes">
              {nodes.map((node) => {
                const profileHandlers = getProfileHandlers(node.profileData, {
                  enablePin: true,
                }) as ComponentProps<'g'>;

                return (
                  <g
                    key={node.key}
                    className={node.className}
                    {...profileHandlers}
                  >
                    <rect
                      x={node.x - NODE_WIDTH / 2}
                      y={node.y - NODE_HEIGHT / 2}
                      width={NODE_WIDTH}
                      height={NODE_HEIGHT}
                      rx={10}
                      className={`node-rect${node.isLeaf && node.isEmpty ? ' node-placeholder' : ''}`}
                    />
                    <text className="node-text" x={node.x} y={node.y - 2}>
                      {node.textPrimary}
                    </text>
                    {node.textMeta ? (
                      <text className="node-meta" x={node.x} y={node.y + 13}>
                        {node.textMeta}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
        {resultsReady ? (
          <button
            type="button"
            className="bracket-result-tab"
            onClick={onOpenResults}
            aria-label="Open tournament results"
          >
            <span className="bracket-result-kicker">Result</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
