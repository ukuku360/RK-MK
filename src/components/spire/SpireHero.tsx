import spireLogo from '../../assets/branding/spire/logos/spire-logo.svg';
import type { EventPreset, ViewMode } from '../../types';

interface SpireHeroProps {
  currentView: ViewMode;
  headline: string;
  preset: EventPreset;
  shareStatus: string;
  onShare: () => void;
  onViewChange: (view: ViewMode) => void;
}

export function SpireHero({
  currentView,
  headline,
  preset,
  shareStatus,
  onShare,
  onViewChange,
}: SpireHeroProps) {
  const currentViewLabel = currentView === 'public' ? preset.publicViewLabel : preset.adminViewLabel;
  const shareStatusMessage =
    shareStatus || 'Copy the public event link for resident signups and live standings.';

  return (
    <header className="spire-hero">
      <div className="spire-hero-copy">
        <div className="spire-hero-brand-row">
          <p className="spire-hero-kicker">Spire Student Living</p>
          <div className="spire-hero-logo-chip">
            <img className="spire-hero-logo" src={spireLogo} alt="Spire Student Living" />
          </div>
        </div>

        <div className="spire-hero-title-wrap">
          <p className="spire-hero-title-kicker">Resident race night</p>
          <h1 className="spire-hero-title">
            <span className="spire-hero-title-main">Mario Kart</span>
            <span className="spire-hero-title-sub">Cup</span>
          </h1>
          <p className="spire-hero-title-meta">{headline}</p>
        </div>

        <p className="spire-hero-subtitle">{preset.subtitle}</p>

        <div className="spire-hero-highlights" aria-label="Event overview">
          <div className="spire-hero-highlight">
            <span>Format</span>
            <strong>{preset.summaryLead}</strong>
          </div>
          <div className="spire-hero-highlight">
            <span>Live view</span>
            <strong>{currentViewLabel}</strong>
          </div>
        </div>
      </div>

      <aside className="spire-hero-panel">
        <div className="spire-hero-panel-section">
          <p className="spire-hero-panel-kicker">View mode</p>
          <p className="spire-hero-panel-copy">
            Switch between resident signup flow and race control without leaving the event page.
          </p>

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
        </div>

        <div className="spire-hero-panel-section">
          <p className="spire-hero-panel-kicker">Share</p>
          <p className="spire-hero-panel-copy">
            Send one link for registrations, standings, and the podium reveal.
          </p>

          <div className="spire-hero-actions">
            <button type="button" className="spire-share-button" onClick={onShare}>
              Share Event Link
            </button>
            <p className="spire-share-status" aria-live="polite">
              {shareStatusMessage}
            </p>
          </div>
        </div>
      </aside>
    </header>
  );
}
