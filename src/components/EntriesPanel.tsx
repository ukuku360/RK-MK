import type { HTMLAttributes } from 'react';
import { EVENT_PRESET } from '../constants';
import type { ProfileHandlerFactory } from '../hooks/useProfileCard';
import type { EventPreset, PlayerRecord } from '../types';
import { makeProfileCardData } from '../utils/profile';

interface EntriesPanelProps {
  players: PlayerRecord[];
  waitingPlayers: PlayerRecord[];
  countText: string;
  canDelete: boolean;
  canToggleCheckIn?: boolean;
  preset?: EventPreset;
  onDeletePlayer: (index: number) => void;
  onDeleteWaitingPlayer: (index: number) => void;
  onTogglePlayerCheckIn?: (index: number) => void;
  onToggleWaitingPlayerCheckIn?: (index: number) => void;
  getProfileHandlers: ProfileHandlerFactory;
}

export function EntriesPanel({
  players,
  waitingPlayers,
  countText,
  canDelete,
  canToggleCheckIn = false,
  preset = EVENT_PRESET,
  onDeletePlayer,
  onDeleteWaitingPlayer,
  onTogglePlayerCheckIn,
  onToggleWaitingPlayerCheckIn,
  getProfileHandlers,
}: EntriesPanelProps) {
  return (
    <section className="panel user-card entries-panel" aria-labelledby="entriesTitle">
      <h2 id="entriesTitle">{preset.entryListTitle}</h2>
      <p className="entries-count">{countText}</p>

      <div className="entries-content">
        <div className="entries-scroll-area">
          <ul className="players">
            {players.length === 0 ? (
              <li className="placeholder">No drivers yet. Claim the first grid slot.</li>
            ) : (
              players.map((player, index) => {
                const profileData = makeProfileCardData(
                  player,
                  `${preset.entryMetaLabel} ${index + 1}`,
                );
                const profileHandlers = getProfileHandlers(profileData, {
                  enablePin: true,
                  releasePinnedOnHover: true,
                }) as HTMLAttributes<HTMLDivElement>;

                return (
                  <li key={player.id || `${player.name}-${index}`}>
                    <div
                      className={`player-row${profileData ? ' has-profile' : ''}`}
                      {...profileHandlers}
                    >
                      <span className={`player-name${profileData ? ' has-profile' : ''}`}>
                        {player.name}
                      </span>
                      {player.checkedIn ? (
                        <span className="player-status-pill">Checked In</span>
                      ) : null}
                      {canToggleCheckIn ? (
                        <button
                          type="button"
                          className="admin-checkin"
                          onClick={(event) => {
                            event.stopPropagation();
                            onTogglePlayerCheckIn?.(index);
                          }}
                        >
                          {player.checkedIn ? 'Undo Check-In' : 'Check In'}
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          className="admin-delete"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeletePlayer(index);
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          {waitingPlayers.length > 0 ? (
            <section className="waitlist-section" aria-labelledby="waitlistCountText">
              <div className="waitlist-head">
                <p className="entries-count waitlist-count" id="waitlistCountText">
                  {preset.waitlistLabel}: {waitingPlayers.length}
                </p>
                <p className="waitlist-note">{preset.waitlistNote}</p>
              </div>
              <ul className="players waitlist-players">
                {waitingPlayers.map((player, index) => {
                  const profileData = makeProfileCardData(
                    player,
                    `${preset.waitlistMetaLabel} ${index + 1}`,
                  );
                  const profileHandlers = getProfileHandlers(profileData, {
                    enablePin: true,
                    releasePinnedOnHover: true,
                  }) as HTMLAttributes<HTMLDivElement>;

                  return (
                    <li key={player.id || `${player.name}-${index}`}>
                      <div
                        className={`player-row${profileData ? ' has-profile' : ''}`}
                        {...profileHandlers}
                      >
                        <span className={`player-name${profileData ? ' has-profile' : ''}`}>
                          {player.name}
                        </span>
                        {player.checkedIn ? (
                          <span className="player-status-pill">Checked In</span>
                        ) : null}
                        {canToggleCheckIn ? (
                          <button
                            type="button"
                            className="admin-checkin"
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggleWaitingPlayerCheckIn?.(index);
                            }}
                          >
                            {player.checkedIn ? 'Undo Check-In' : 'Check In'}
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="admin-delete"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteWaitingPlayer(index);
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
