import type { ReactNode } from 'react';
import { MAX_PLAYERS } from '../../constants';
import type { EventPreset, EventRegistrationStatus } from '../../types';

interface SpireSummaryProps {
  registrationStatus: EventRegistrationStatus;
  checkedInPlayersCount: number;
  preset: EventPreset;
  spotlight?: ReactNode;
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
  spotlight,
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
      <article className="spire-summary-card spire-summary-card-status">
        <div className={`spire-summary-status-layout${spotlight ? ' has-spotlight' : ''}`}>
          <div className="spire-summary-status-main">
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
          </div>

          {spotlight ? (
            <div className="spire-summary-status-spotlight">{spotlight}</div>
          ) : null}
        </div>
      </article>

      {showAdminControls ? (
        <article className="spire-summary-card spire-summary-card-admin">
          <p className="spire-summary-kicker">Race Control</p>
          <h3>Admin Controls</h3>
          <p className="spire-summary-status-copy">
            {isAdminMode ? 'Race control verified.' : 'Race control login is required.'}
          </p>
          <div className="spire-summary-admin-actions">
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
              <button type="button" onClick={onResetBracket}>
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
      ) : null}
    </section>
  );
}
