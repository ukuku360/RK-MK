import type { HTMLAttributes } from 'react';
import type { ProfileHandlerFactory } from '../hooks/useProfileCard';
import type { PlayerRecord } from '../types';
import { makeProfileCardData } from '../utils/profile';
import { CapacityGauge } from './CapacityGauge';
import { MAX_PLAYERS } from '../constants';

interface EntriesPanelProps {
  players: PlayerRecord[];
  waitingPlayers: PlayerRecord[];
  countText: string;
  canDelete: boolean;
  onDeletePlayer: (index: number) => void;
  onDeleteWaitingPlayer: (index: number) => void;
  getProfileHandlers: ProfileHandlerFactory;
}

export function EntriesPanel({
  players,
  waitingPlayers,
  countText,
  canDelete,
  onDeletePlayer,
  onDeleteWaitingPlayer,
  getProfileHandlers,
}: EntriesPanelProps) {
  return (
    <section className="panel user-card entries-panel" aria-labelledby="entriesTitle">
      <h2 id="entriesTitle">Entries</h2>

      {/* top row: entries badge + compact gauge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginTop: 8 }}>
        <p className="entries-count" style={{ margin: 0 }}>{countText}</p>
        <div style={{ width: 260 }} aria-hidden>
          <CapacityGauge
            playerCount={players.length}
            maxPlayers={MAX_PLAYERS}
            waitlistCount={waitingPlayers.length}
          />
        </div>
      </div>

      <div className="entries-content" style={{ marginTop: 12 }}>
        <div className="entries-scroll-area">
          <ul className="players">
            {players.length === 0 ? (
              <li className="placeholder">No entries yet. Add the first participant.</li>
            ) : (
              players.map((player, index) => {
                const profileData = makeProfileCardData(player, `Entry ${index + 1}`);
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
                  Waitlist: {waitingPlayers.length}
                </p>
                <p className="waitlist-note">Late signups queue here.</p>
              </div>
              <ul className="players waitlist-players">
                {waitingPlayers.map((player, index) => {
                  const profileData = makeProfileCardData(player, `Waitlist ${index + 1}`);
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
