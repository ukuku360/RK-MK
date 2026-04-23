import roomingKosBrandmark from '../assets/branding/roomingkos/rk-brandmark.png';
import { EVENT_PRESET } from '../constants';
import { RoomingKosMotionPreview } from './RoomingKosMotionPreview';
import type { ViewMode } from '../types';

interface HeroHeaderProps {
  currentView: ViewMode;
  headline: string;
  shareStatus: string;
  onShare: () => void;
  onViewChange: (view: ViewMode) => void;
}

export function HeroHeader({
  currentView,
  headline,
  shareStatus,
  onShare,
  onViewChange,
}: HeroHeaderProps) {
  return (
    <header className="hero">
      <RoomingKosMotionPreview />
      <h1>{headline}</h1>
      <p className="subtitle">{EVENT_PRESET.subtitle}</p>
      <div className="mode-switch" role="tablist" aria-label="View mode">
        <button
          type="button"
          className={`mode-tab${currentView === 'public' ? ' active' : ''}`}
          role="tab"
          aria-pressed={currentView === 'public'}
          onClick={() => onViewChange('public')}
        >
          {EVENT_PRESET.publicViewLabel}
        </button>
        <button
          type="button"
          className={`mode-tab mode-tab-admin${currentView === 'admin' ? ' active' : ''}`}
          role="tab"
          aria-label={EVENT_PRESET.adminViewLabel}
          aria-pressed={currentView === 'admin'}
          onClick={() => onViewChange('admin')}
        >
          <span className="mode-admin-badge" aria-hidden="true">
            <img className="mode-admin-mark" src={roomingKosBrandmark} alt="" />
          </span>
        </button>
      </div>
      <div className="hero-cta">
        <button type="button" onClick={onShare}>
          Share Event Link
        </button>
        <p className="share-status" aria-live="polite">
          {shareStatus}
        </p>
      </div>
    </header>
  );
}
