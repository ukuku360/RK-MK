import { MAX_PLAYERS } from '../../constants';
import type { EventPreset, EventRegistrationStatus } from '../../types';

interface SpireSummaryProps {
  registrationStatus: EventRegistrationStatus;
  checkedInPlayersCount: number;
  preset: EventPreset;
  showAdminControls?: boolean;
  isAdminMode?: boolean;
  canUseAdminControls?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
  onResetBracket?: () => void;
  onResetEvent?: () => void;
}

function getRegistrationStatusLabel(status: EventRegistrationStatus) {
  if (status === 'locked') {
    return 'Locked';
  }

  if (status === 'full') {
    return 'Full';
  }

  if (status === 'nearly-full') {
    return 'Nearly Full';
  }

  return 'Open';
}

export function SpireSummary({
  registrationStatus,
  checkedInPlayersCount,
  preset,
  showAdminControls = false,
  isAdminMode = false,
  canUseAdminControls = false,
  onLogin,
  onLogout,
  onResetBracket,
  onResetEvent,
}: SpireSummaryProps) {
  const registrationStatusLabel = getRegistrationStatusLabel(registrationStatus);
  const registrationStatusDescription =
    registrationStatus === 'locked'
      ? preset.summaryStatusDescriptions.locked
      : registrationStatus === 'full'
        ? preset.summaryStatusDescriptions.full
        : registrationStatus === 'nearly-full'
          ? preset.summaryStatusDescriptions.nearlyFull
          : preset.summaryStatusDescriptions.open;

  return (
    <section className={`spire-summary-shell${showAdminControls ? ' is-admin' : ''}`}>
      <article className="spire-summary-card spire-summary-card-timing">
        <p className="spire-summary-kicker">{preset.summaryTitle}</p>
        <h2>{preset.summaryLead}</h2>
        <div className="spire-summary-meta">
          <div>
            <span>{preset.summaryDateLabel}</span>
            <strong>{preset.summaryDateLong}</strong>
          </div>
          <div>
            <span>Start</span>
            <strong>{preset.summaryTimeLabel}</strong>
          </div>
          <div>
            <span>Timezone</span>
            <strong>{preset.summaryTimezoneLabel}</strong>
          </div>
        </div>
      </article>

      <article className="spire-summary-card spire-summary-card-status">
        <p className="spire-summary-kicker">{preset.summaryStatusLabel}</p>
        <div className="spire-summary-status-pill">{registrationStatusLabel}</div>
        <p className="spire-summary-status-copy">{registrationStatusDescription}</p>
        <div className="spire-summary-metrics">
          <div>
            <span>Capacity</span>
            <strong>{MAX_PLAYERS}</strong>
          </div>
          <div>
            <span>Checked in</span>
            <strong>{checkedInPlayersCount}</strong>
          </div>
        </div>
      </article>

      <article className="spire-summary-card spire-summary-card-admin">
        <p className="spire-summary-kicker">Race control</p>
        <h3>{isAdminMode ? 'Verified session' : 'Private admin view'}</h3>
        <p className="spire-summary-status-copy">
          {isAdminMode
            ? 'Use the admin view to draw qualifier groups, record finishing order, and publish the podium.'
            : 'Admin login stays separate from the public resident experience.'}
        </p>
        <div className="spire-summary-actions">
          {!isAdminMode ? (
            <button type="button" onClick={() => onLogin?.()}>
              Admin Login
            </button>
          ) : (
            <button type="button" onClick={onLogout}>
              Log Out
            </button>
          )}
          {canUseAdminControls ? (
            <button type="button" className="button-secondary" onClick={onResetBracket}>
              Reset Draw
            </button>
          ) : null}
          {canUseAdminControls ? (
            <button type="button" className="button-secondary" onClick={onResetEvent}>
              Reset Event
            </button>
          ) : null}
        </div>
      </article>
    </section>
  );
}
