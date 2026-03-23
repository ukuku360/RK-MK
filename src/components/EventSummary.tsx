interface EventSummaryProps {
  showAdminControls?: boolean;
  isAdminMode?: boolean;
  canUseAdminControls?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
  onReset?: () => void;
}

function getAprilSecondCountdown() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const today = new Date(currentYear, now.getMonth(), now.getDate());

  let eventDate = new Date(currentYear, 3, 2);
  if (today.getTime() > eventDate.getTime()) {
    eventDate = new Date(currentYear + 1, 3, 2);
  }

  const diffMs = eventDate.getTime() - today.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  if (daysLeft === 0) {
    return 'D-DAY';
  }

  return `D-${daysLeft}`;
}

export function EventSummary({
  showAdminControls = false,
  isAdminMode = false,
  canUseAdminControls = false,
  onLogin,
  onLogout,
  onReset,
}: EventSummaryProps) {
  const countdownLabel = getAprilSecondCountdown();
  const prizes = [
    {
      tier: '1st',
      amount: '$50',
      detail: 'Woolworths gift card',
      className: 'prize-card prize-card-first',
    },
    {
      tier: '2nd',
      amount: '$30',
      detail: 'Woolworths gift card',
      className: 'prize-card prize-card-second',
    },
    {
      tier: '3rd',
      amount: '$20',
      detail: 'Woolworths gift card',
      className: 'prize-card prize-card-third',
    },
  ];

  return (
    <div className={`panel event-summary${showAdminControls ? ' event-summary-admin-active' : ''}`}>
      <div className="event-summary-copy">
        <p className="event-summary-title">Event Summary</p>
        <p className="event-summary-lead">
          <span className="event-summary-slots">Only 16 slots</span>
        </p>
        <div className="event-summary-highlights" aria-label="Event date and availability">
          <div className="event-summary-calendar" aria-hidden="true">
            <span className="event-summary-calendar-ring event-summary-calendar-ring-left" />
            <span className="event-summary-calendar-ring event-summary-calendar-ring-right" />
            <span className="event-summary-calendar-top">APR</span>
            <span className="event-summary-calendar-day">02</span>
            <span className="event-summary-calendar-sticker">Play</span>
          </div>
          <div className="event-summary-date-stack">
            <div className="event-summary-date-copy">
              <p className="event-summary-date-label">Event Day</p>
              <p className="event-summary-date-value">April 2</p>
            </div>
            <div className="event-summary-countdown" aria-label={`Countdown ${countdownLabel}`}>
              <span className="event-summary-countdown-kicker">Countdown</span>
              <span className="event-summary-countdown-value">{countdownLabel}</span>
              <span className="event-summary-countdown-note">Until game night</span>
            </div>
          </div>
        </div>
        <ul className="prize-grid" aria-label="Prize tiers">
          {prizes.map((prize) => (
            <li key={prize.tier} className={prize.className}>
              <span className="prize-tier">{prize.tier}</span>
              <span className="prize-label">Prize</span>
              <span className="prize-amount">{prize.amount}</span>
              <span className="prize-detail">{prize.detail}</span>
            </li>
          ))}
        </ul>
      </div>
      {showAdminControls ? (
        <div className="event-summary-admin">
          <p className="event-summary-admin-label">Admin Controls</p>
          <p className="event-summary-admin-note">
            {isAdminMode ? 'Admin login verified.' : 'Admin login is required.'}
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
              <button id="clearButton" type="button" onClick={onReset}>
                Reset
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
