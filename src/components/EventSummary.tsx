import { EVENT_PRESET, MAX_PLAYERS } from '../constants';
import type { EventRegistrationStatus } from '../types';

interface EventSummaryProps {
  registrationStatus: EventRegistrationStatus;
  checkedInPlayersCount: number;
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
    return 'Nearly full';
  }

  return 'Open';
}

export function EventSummary({
  registrationStatus,
  checkedInPlayersCount,
  showAdminControls = false,
  isAdminMode = false,
  canUseAdminControls = false,
  onLogin,
  onLogout,
  onResetBracket,
  onResetEvent,
}: EventSummaryProps) {
  const registrationStatusLabel = getRegistrationStatusLabel(registrationStatus);
  const registrationStatusDescription =
    registrationStatus === 'locked'
      ? EVENT_PRESET.summaryStatusDescriptions.locked
      : registrationStatus === 'full'
        ? EVENT_PRESET.summaryStatusDescriptions.full
        : registrationStatus === 'nearly-full'
          ? EVENT_PRESET.summaryStatusDescriptions.nearlyFull
          : EVENT_PRESET.summaryStatusDescriptions.open;

  return (
    <div className={`panel event-summary${showAdminControls ? ' event-summary-admin-active' : ''}`}>
      <div className="event-summary-copy">
        <p className="event-summary-title">{EVENT_PRESET.summaryTitle}</p>
        <p className="event-summary-lead">
          <span className="event-summary-slots">{EVENT_PRESET.summaryLead}</span>
        </p>
        <div className="event-summary-highlights" aria-label="Event date and availability">
          <div className="event-summary-calendar" aria-hidden="true">
            <span className="event-summary-calendar-ring event-summary-calendar-ring-left" />
            <span className="event-summary-calendar-ring event-summary-calendar-ring-right" />
            <span className="event-summary-calendar-top">{EVENT_PRESET.eventDate.monthShort}</span>
            <span className="event-summary-calendar-day">{EVENT_PRESET.eventDate.day}</span>
          </div>
          <div className="event-summary-meta">
            <p className="event-summary-date-label">{EVENT_PRESET.summaryDateLabel}</p>
            <div className="event-summary-meta-row">
              <p className="event-summary-date-value">{EVENT_PRESET.summaryDateLong}</p>
              <span className="event-summary-meta-separator" aria-hidden="true" />
              <div
                className="event-summary-time-inline"
                aria-label={`Event starts at ${EVENT_PRESET.summaryTimeLabel}`}
              >
                <div className="event-summary-clock" aria-hidden="true">
                  <span className="event-summary-clock-hand event-summary-clock-hand-hour" />
                  <span className="event-summary-clock-hand event-summary-clock-hand-minute" />
                  <span className="event-summary-clock-center" />
                </div>
                <span className="event-summary-time-inline-label">
                  {EVENT_PRESET.summaryTimeLabel}
                </span>
              </div>
            </div>
            <p className="event-summary-date-label">{EVENT_PRESET.summaryTimezoneLabel}</p>
          </div>
          <div
            className="event-summary-countdown-inline"
            aria-label={`${EVENT_PRESET.summaryStatusLabel}: ${registrationStatusLabel}`}
          >
            <span className="event-summary-countdown-inline-kicker">
              {EVENT_PRESET.summaryStatusLabel}
            </span>
            <span className="event-summary-countdown-inline-value">{registrationStatusLabel}</span>
          </div>
        </div>
        <p className="event-summary-footnote">{registrationStatusDescription}</p>
        <ul className="prize-grid" aria-label="Prize tiers">
          {EVENT_PRESET.prizes.map((prize) => (
            <li key={prize.tier} className={prize.className}>
              <span className="prize-tier">{prize.tier}</span>
              <span className="prize-label">Prize</span>
              <span className="prize-amount">{prize.amount}</span>
              <span className="prize-detail">{prize.detail}</span>
            </li>
          ))}
        </ul>
        <p className="event-summary-footnote">
          Grid capacity: {MAX_PLAYERS} drivers. Checked in: {checkedInPlayersCount}. Group winners
          advance to the final and the top three finalists reach the podium.
        </p>
      </div>
      {showAdminControls ? (
        <div className="event-summary-admin">
          <p className="event-summary-admin-label">Race Control</p>
          <p className="event-summary-admin-note">
            {isAdminMode ? 'Race control verified.' : 'Race control login is required.'}
          </p>
          <div className="event-summary-admin-actions">
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
              <button id="clearButton" type="button" onClick={onResetBracket}>
                Reset Draw
              </button>
            ) : null}
            {canUseAdminControls ? (
              <button type="button" className="button-secondary" onClick={onResetEvent}>
                Reset Event
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
