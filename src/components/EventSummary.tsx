interface EventSummaryProps {
  showAdminControls?: boolean;
  isAdminMode?: boolean;
  canUseAdminControls?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
  onReset?: () => void;
}

export function EventSummary({
  showAdminControls = false,
  isAdminMode = false,
  canUseAdminControls = false,
  onLogin,
  onLogout,
  onReset,
}: EventSummaryProps) {
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
          <span>open. Secure your place now.</span>
        </p>
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
