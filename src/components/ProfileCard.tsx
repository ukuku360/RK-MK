import type { RefObject } from 'react';
import type { ProfileCardData } from '../types';

interface ProfileCardProps {
  cardRef: RefObject<HTMLDivElement | null>;
  data: ProfileCardData | null;
  visible: boolean;
  pinned: boolean;
  left: number;
  top: number;
}

export function ProfileCard({
  cardRef,
  data,
  visible,
  pinned,
  left,
  top,
}: ProfileCardProps) {
  return (
    <div
      ref={cardRef}
      className={`player-profile-card${visible ? ' visible' : ''}${pinned ? ' pinned' : ''}`}
      aria-hidden={visible ? 'false' : 'true'}
      style={{ left, top }}
    >
      <p className="player-profile-kicker">Driver Intel</p>
      <h3 className="player-profile-name">{data?.name || 'Driver'}</h3>
      <p className="player-profile-meta">{data?.metaLabel || 'Grid Slot 1'}</p>
      <div className="player-profile-grid">
        <div className="player-profile-block nickname">
          <span className="player-profile-label">Racer Tag</span>
          <p className="player-profile-value">{data?.nickname || 'No racer tag listed yet.'}</p>
        </div>
        <div className="player-profile-block unit-number">
          <span className="player-profile-label">Unit Number</span>
          <p className="player-profile-value">{data?.teamTag || 'No unit number listed yet.'}</p>
        </div>
      </div>
    </div>
  );
}
