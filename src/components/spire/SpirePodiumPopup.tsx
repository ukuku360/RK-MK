import { useEffect, useState } from 'react';
import spireLogo from '../../assets/branding/spire/logos/spire-logo.svg';
import type { EventPreset, PlayerRecord } from '../../types';

interface SpirePodiumPopupProps {
  visible: boolean;
  onClose: () => void;
  firstPlace?: PlayerRecord;
  secondPlace?: PlayerRecord;
  thirdPlace?: PlayerRecord;
  preset: EventPreset;
  onShareResult: () => void;
  shareStatus: string;
  isSharingResult: boolean;
}

function getPlayerMeta(player?: PlayerRecord) {
  if (!player || player.empty) {
    return {
      name: 'TBD',
      meta: 'Awaiting final results',
    };
  }

  return {
    name: player.name,
    meta: player.nickname || player.teamTag || 'Resident',
  };
}

export function SpirePodiumPopup({
  visible,
  onClose,
  firstPlace,
  secondPlace,
  thirdPlace,
  preset,
  onShareResult,
  shareStatus,
  isSharingResult,
}: SpirePodiumPopupProps) {
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (visible) {
      setRender(true);
      return;
    }

    const timer = window.setTimeout(() => setRender(false), 260);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!render && !visible) {
    return null;
  }

  const podium = [
    {
      rank: '2',
      label: 'Second',
      player: getPlayerMeta(secondPlace),
      className: 'spire-podium-card-second',
    },
    {
      rank: '1',
      label: 'First',
      player: getPlayerMeta(firstPlace),
      className: 'spire-podium-card-first',
    },
    {
      rank: '3',
      label: 'Third',
      player: getPlayerMeta(thirdPlace),
      className: 'spire-podium-card-third',
    },
  ] as const;

  return (
    <div className={`spire-podium-overlay${visible ? ' visible' : ''}`}>
      <div className="spire-podium-shell" role="dialog" aria-modal="true" aria-labelledby="spire-podium-title">
        <button type="button" className="spire-podium-close" onClick={onClose} aria-label="Close podium">
          ×
        </button>

        <div className="spire-podium-brand">
          <img src={spireLogo} alt="Spire Student Living" />
          <p>Mario Kart Night</p>
        </div>

        <div className="spire-podium-header">
          <h2 id="spire-podium-title">{preset.championHeading}</h2>
          <p>Final standings locked for the Spire race night.</p>
        </div>

        <div className="spire-podium-grid">
          {podium.map((placement) => (
            <article key={placement.rank} className={`spire-podium-card ${placement.className}`}>
              <span className="spire-podium-rank">{placement.label}</span>
              <strong className="spire-podium-name">{placement.player.name}</strong>
              <p className="spire-podium-meta">{placement.player.meta}</p>
              <div className="spire-podium-block" aria-hidden="true">
                {placement.rank}
              </div>
            </article>
          ))}
        </div>

        <div className="spire-podium-actions">
          <button
            type="button"
            className="spire-podium-share"
            onClick={onShareResult}
            disabled={isSharingResult}
          >
            {isSharingResult ? 'Preparing PNG...' : preset.podiumShareButtonText}
          </button>
          <p className="spire-podium-share-status" aria-live="polite">
            {shareStatus}
          </p>
        </div>
      </div>
    </div>
  );
}
