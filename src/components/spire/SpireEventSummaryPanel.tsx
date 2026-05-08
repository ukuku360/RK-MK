import type { EventPreset, EventRegistrationStatus } from '../../types';

interface SpireEventSummaryPanelProps {
  preset: EventPreset;
  registrationStatus: EventRegistrationStatus;
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

export function SpireEventSummaryPanel({
  preset,
  registrationStatus,
}: SpireEventSummaryPanelProps) {
  const registrationStatusLabel = getRegistrationStatusLabel(registrationStatus);
  const registrationStatusDescription =
    registrationStatus === 'locked'
      ? preset.summaryStatusDescriptions.locked
      : registrationStatus === 'full'
        ? preset.summaryStatusDescriptions.full
        : registrationStatus === 'nearly-full'
          ? preset.summaryStatusDescriptions.nearlyFull
          : '';

  return (
    <section className="spire-event-summary-panel" aria-labelledby="spire-event-summary-title">
      <div className="spire-event-summary-heading">
        <p id="spire-event-summary-title" className="spire-event-summary-kicker">
          {preset.summaryTitle}
        </p>
        <p className="spire-event-summary-lead">{preset.summaryLead}</p>
      </div>

      <div className="spire-event-summary-main" aria-label="Event date and availability">
        <div className="spire-event-summary-calendar" aria-hidden="true">
          <span className="spire-event-summary-calendar-ring spire-event-summary-calendar-ring-left" />
          <span className="spire-event-summary-calendar-ring spire-event-summary-calendar-ring-right" />
          <span className="spire-event-summary-calendar-month">{preset.eventDate.monthShort}</span>
          <span className="spire-event-summary-calendar-day">{preset.eventDate.day}</span>
        </div>

        <div className="spire-event-summary-date">
          <span>{preset.summaryDateLabel}</span>
          <strong>{preset.summaryDateLong}</strong>
          <span>{preset.summaryTimezoneLabel}</span>
        </div>

        <div className="spire-event-summary-time" aria-label={`Event starts at ${preset.summaryTimeLabel}`}>
          <span className="spire-event-summary-clock" aria-hidden="true">
            <span className="spire-event-summary-clock-hand spire-event-summary-clock-hour" />
            <span className="spire-event-summary-clock-hand spire-event-summary-clock-minute" />
          </span>
          <strong>{preset.summaryTimeLabel}</strong>
        </div>

        <div
          className="spire-event-summary-status"
          aria-label={`${preset.summaryStatusLabel}: ${registrationStatusLabel}`}
        >
          <span>{preset.summaryStatusLabel}</span>
          <strong>{registrationStatusLabel}</strong>
        </div>
      </div>

      {registrationStatusDescription ? (
        <p className="spire-event-summary-note">{registrationStatusDescription}</p>
      ) : null}

      <ul className="spire-event-prize-grid" aria-label="Prize tiers">
        {preset.prizes.map((prize) => (
          <li
            key={prize.tier}
            className={`spire-event-prize-card spire-event-prize-card-${prize.tier.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
          >
            <span className="spire-event-prize-tier">{prize.tier}</span>
            <span className="spire-event-prize-label">Prize</span>
            <span className="spire-event-prize-amount">{prize.amount}</span>
            <span className="spire-event-prize-detail">{prize.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
