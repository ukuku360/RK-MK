import roomingKosBrandmark from '../../ROOMINGKOS BRANDING/Logo/PNG/RK_Brandmark_reduced_Rev_CMYK@4x.png';
import { RoomingKosMotionPreview } from './RoomingKosMotionPreview';
import type { ViewMode } from '../types';

interface HeroHeaderProps {
  currentView: ViewMode;
  shareStatus: string;
  onShare: () => void;
  onViewChange: (view: ViewMode) => void;
}

export function HeroHeader({
  currentView,
  shareStatus,
  onShare,
  onViewChange,
}: HeroHeaderProps) {
  return (
    <header className="hero">
      <RoomingKosMotionPreview />
      <h1>Swanston Table Tennis Tournament</h1>
      <div className="mode-switch" role="tablist" aria-label="View mode">
        <button
          type="button"
          className={`mode-tab${currentView === 'warriors' ? ' active' : ''}`}
          role="tab"
          aria-pressed={currentView === 'warriors'}
          onClick={() => onViewChange('warriors')}
        >
          Warriors
        </button>
        <button
          type="button"
          className={`mode-tab mode-tab-admin${currentView === 'admin' ? ' active' : ''}`}
          role="tab"
          aria-label="Admin"
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
          Share This Event
        </button>
        <p className="share-status" aria-live="polite">
          {shareStatus}
        </p>
      </div>
    </header>
  );
}
