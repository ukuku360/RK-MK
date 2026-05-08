import { useEffect, useMemo, useState } from 'react';

type ExploreIcon = 'gamepad' | 'flags' | 'mushroom' | 'spiral';

interface ExploreCard {
  id: string;
  icon: ExploreIcon;
  cardTitle: string;
  cardCopy: string;
  modalTitle: string;
  modalCopy: string;
}

const EXPLORE_CARDS: ExploreCard[] = [
  {
    id: 'character',
    icon: 'gamepad',
    cardTitle: 'PICK A CHARACTER',
    cardCopy: 'Mario, Luigi, Peach & many more',
    modalTitle: 'PICK A CHARACTER',
    modalCopy:
      'There are over 40 characters to choose from - Mario, Luigi, Bowser, Princess Peach, and plenty more. Each character has slightly different stats (speed, acceleration, handling), just pick whoever looks the coolest to you. No wrong choices here.',
  },
  {
    id: 'track',
    icon: 'flags',
    cardTitle: 'RACE THE TRACK',
    cardCopy: '4 groups, 1 final.',
    modalTitle: 'RACE NIGHT FORMAT',
    modalCopy:
      'The Spire Cup runs 16 residents across 4 qualifier groups. Race around a track 3 laps, cross the finish line, and the top performers from each group earn a spot in the championship final. Simple as that - compete with your group, then watch the final unfold.',
  },
  {
    id: 'items',
    icon: 'mushroom',
    cardTitle: 'COLLECT THE ITEMS',
    cardCopy: 'Boost, shell, banana, literally anything on your way!',
    modalTitle: 'COLLECT & USE ITEMS',
    modalCopy:
      'Item boxes appear on the track, drive through them to grab a random item. You might get a speed mushroom, a red shell that homes in on the racer ahead, a banana peel to drop behind you, or the dreaded blue shell that targets whoever is in first place. Use them wisely (or chaotically).',
  },
  {
    id: 'chaos',
    icon: 'spiral',
    cardTitle: 'ENJOY THE CHAOS',
    cardCopy: 'Anyone can win!',
    modalTitle: 'ANYONE CAN WIN - SERIOUSLY',
    modalCopy:
      'This is what makes Mario Kart so brilliant at parties. A first-timer in last place can get a lucky item drop and rocket to the front. A pro in first place can get blue-shelled at the finish line. The randomness keeps every race exciting right until the very last second.',
  },
];

function ExploreIconSvg({ icon }: { icon: ExploreIcon }) {
  if (icon === 'gamepad') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M16 20h-3.5a8 8 0 0 0-7.7 5.9l-1.7 6.2a5.1 5.1 0 0 0 8.5 4.9l5.1-5h14.6l5.1 5a5.1 5.1 0 0 0 8.5-4.9l-1.7-6.2a8 8 0 0 0-7.7-5.9H32" />
        <path d="M17 20c.6-3.4 2.7-5 7-5s6.4 1.6 7 5" />
        <path d="M13 25v8" />
        <path d="M9 29h8" />
        <circle cx="33" cy="27" r="1.7" />
        <circle cx="38" cy="31" r="1.7" />
      </svg>
    );
  }

  if (icon === 'flags') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M12 41 23 10" />
        <path d="M36 41 25 10" />
        <path d="M22 12c-4-3-8-3.4-12-1.2 1.8 3.5 4.3 5.6 8.5 6.2" />
        <path d="M26 12c4-3 8-3.4 12-1.2-1.8 3.5-4.3 5.6-8.5 6.2" />
        <path d="M18.5 17c-2.8 2-5.4 2.3-8.2.9" />
        <path d="M29.5 17c2.8 2 5.4 2.3 8.2.9" />
        <path d="M17 15.5 20.5 20" />
        <path d="M31 15.5 27.5 20" />
      </svg>
    );
  }

  if (icon === 'mushroom') {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M8 24C8 13.8 15.1 7 24 7s16 6.8 16 17H8Z" />
        <path d="M15 24h18v7.5A9 9 0 0 1 24 40a9 9 0 0 1-9-8.5V24Z" />
        <circle cx="16" cy="18" r="3.5" />
        <circle cx="32" cy="18" r="3.5" />
        <path d="M21 31v2" />
        <path d="M27 31v2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 8c9 0 16 6.3 16 14.4 0 9-7.5 16.6-17 16.6-8 0-14.5-5.1-14.5-12 0-6.2 5.2-11.2 11.8-11.2 5.5 0 9.8 3.7 9.8 8.3 0 4.2-3.5 7.6-7.8 7.6-3.5 0-6.3-2.1-6.3-4.9 0-2.4 2-4.3 4.5-4.3" />
    </svg>
  );
}

export function SpireExploreCards() {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const activeCard = useMemo(
    () => EXPLORE_CARDS.find((card) => card.id === activeCardId) || null,
    [activeCardId],
  );

  useEffect(() => {
    if (!activeCard) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveCardId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeCard]);

  return (
    <>
      <section className="spire-explore" aria-labelledby="spire-explore-title">
        <h2 id="spire-explore-title">TAP TO EXPLORE THE GAME</h2>
        <div className="spire-explore-grid">
          {EXPLORE_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              className="spire-explore-card"
              aria-haspopup="dialog"
              aria-controls="spire-explore-modal"
              onClick={() => setActiveCardId(card.id)}
            >
              <span className="spire-explore-icon">
                <ExploreIconSvg icon={card.icon} />
              </span>
              <span className="spire-explore-card-title">{card.cardTitle}</span>
              <span className="spire-explore-card-copy">{card.cardCopy}</span>
            </button>
          ))}
        </div>
      </section>

      {activeCard ? (
        <div
          className="spire-explore-modal-backdrop"
          role="presentation"
          onClick={() => setActiveCardId(null)}
        >
          <div
            id="spire-explore-modal"
            className="spire-explore-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="spire-explore-modal-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="spire-explore-modal-close"
              aria-label="Close game detail"
              onClick={() => setActiveCardId(null)}
            >
              Close
            </button>
            <span className="spire-explore-modal-icon">
              <ExploreIconSvg icon={activeCard.icon} />
            </span>
            <h3 id="spire-explore-modal-title">{activeCard.modalTitle}</h3>
            <p>{activeCard.modalCopy}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
