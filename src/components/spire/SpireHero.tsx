import type { EventPreset, ViewMode } from '../../types';
import { SpireMotionPreview } from './SpireMotionPreview';

interface SpireHeroProps {
  currentView: ViewMode;
  preset: EventPreset;
  onShare: () => void;
  onViewChange: (view: ViewMode) => void;
}

export function SpireHero({
  currentView,
  preset,
  onShare,
  onViewChange,
}: SpireHeroProps) {
  return (
    <header className="spire-hero">
      <div className="spire-hero-copy">
        <div className="spire-hero-brand-row">
          <SpireMotionPreview />
        </div>

        <div className="spire-hero-title-wrap">
          <h1 className="spire-hero-title">{preset.title}</h1>
          <p className="spire-hero-subtitle">{preset.subtitle}</p>
        </div>
      </div>

      <aside className="spire-hero-panel" aria-label="Event actions">
        <div className="spire-mode-switch" role="tablist" aria-label="View mode">
          <button
            type="button"
            className={`spire-mode-tab${currentView === 'public' ? ' active' : ''}`}
            role="tab"
            aria-pressed={currentView === 'public'}
            onClick={() => onViewChange('public')}
          >
            {preset.publicViewLabel}
          </button>
          <button
            type="button"
            className={`spire-mode-tab${currentView === 'admin' ? ' active' : ''}`}
            role="tab"
            aria-pressed={currentView === 'admin'}
            onClick={() => onViewChange('admin')}
          >
            {preset.adminViewLabel}
          </button>
        </div>

        <div className="spire-hero-actions">
          <button type="button" className="spire-share-button" onClick={onShare}>
            Share Event Link
          </button>
        </div>
      </aside>
    </header>
  );
}
