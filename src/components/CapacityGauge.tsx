interface CapacityGaugeProps {
  playerCount: number;
  maxPlayers: number;
  waitlistCount: number;
}

const FILLED_EMOJIS = ['🎀', '🧸', '🌸', '🍓', '☁️', '🐰', '💖', '✨', '🌷', '🫧', '🍡', '🩷', '🐣', '🌼', '🍑', '🍒'];

export function CapacityGauge({ playerCount, maxPlayers, waitlistCount }: CapacityGaugeProps) {
  const safeMax = Math.max(1, maxPlayers);
  const filledCount = Math.min(playerCount, safeMax);
  const remainingCount = Math.max(0, safeMax - filledCount);
  const fillPercent = Math.min(100, (filledCount / safeMax) * 100);

  const title = remainingCount === 0 ? '참가 마감!' : remainingCount === 1 ? '자리 거의 다 찼어요!' : '참가 신청 중';
  const subtitle = remainingCount === 0
    ? `현재 참가자 ${filledCount}/${safeMax}. 이제 신청하면 waitlist로 들어가요 💌`
    : `현재 참가자 ${filledCount}/${safeMax}. 이제 ${remainingCount}자리 남아 있어요 💗`;

  return (
    <section className="panel capacity-gauge" aria-label="Participant capacity gauge">
      <div className="capacity-gauge-badge">🐣 참가 현황</div>
      <h3>{title}</h3>
      <p className="capacity-gauge-copy">{subtitle}</p>

      <div className="capacity-gauge-topline">
        <div className="capacity-gauge-count">
          {filledCount}/{safeMax}
          <small>{fillPercent.toFixed(2)}%</small>
        </div>
        <div className="capacity-gauge-remaining">
          {remainingCount === 0 ? 'FULL' : `${remainingCount}자리 남음`}
        </div>
      </div>

      <div className="capacity-gauge-bar" aria-hidden="true">
        <div className="capacity-gauge-fill" style={{ width: `${fillPercent}%` }}>
          <span>{remainingCount <= 1 ? '✨ 거의 꽉 찼어요 ✨' : '💫 신청 진행 중 💫'}</span>
        </div>
      </div>

      <div className="capacity-gauge-slots" aria-hidden="true">
        {Array.from({ length: safeMax }, (_, index) => {
          const filled = index < filledCount;
          return (
            <div key={index} className={`capacity-gauge-slot ${filled ? 'is-filled' : 'is-empty'}`}>
              {filled ? FILLED_EMOJIS[index % FILLED_EMOJIS.length] : '🤍'}
            </div>
          );
        })}
      </div>

      <div className="capacity-gauge-waitlist">
        <strong>Waitlist도 있어요 📝</strong>
        <p>
          자리가 모두 차더라도 <strong>waitlist(대기자 명단)</strong>에 신청할 수 있어요.
          취소 자리가 생기거나 추가 오픈이 되면 waitlist 순서대로 안내드려요.
          {waitlistCount > 0 ? ` 현재 waitlist에는 ${waitlistCount}명 대기 중이에요.` : ''}
        </p>
      </div>
    </section>
  );
}
