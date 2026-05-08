import mushroomImage from '../assets/mk/mushroom.png';
import marioSilhouette from '../assets/mk/super-mario-56.svg';
import type { BrandVariant, EventPreset } from '../types';

interface MarioEventSpotlightProps {
  brandVariant: BrandVariant;
  buildingLabel: string;
  preset: EventPreset;
  className?: string;
  visualOnly?: boolean;
}

export function MarioEventSpotlight({
  brandVariant,
  buildingLabel,
  preset,
  className = '',
  visualOnly = false,
}: MarioEventSpotlightProps) {
  const isSpire = brandVariant === 'spire';
  const classNames = [
    'mario-event-spotlight',
    `mario-event-spotlight-${brandVariant}`,
    visualOnly ? 'mario-event-spotlight-visual-only' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={classNames}
      aria-label="Mario Kart event spotlight"
    >
      {!visualOnly ? (
        <div className="mario-event-spotlight-copy">
          <p className="mario-event-spotlight-kicker">
            {isSpire ? 'Resident race night' : 'Mario Kart warm-up'}
          </p>
          <h2>{isSpire ? 'Bring the boost to Spire.' : 'Power up before the starting grid.'}</h2>
          <p>
            {buildingLabel} racers can lock in a spot, check the race format, and get ready for
            a fast 16-player cup.
          </p>
          <div className="mario-event-spotlight-chips" aria-label="Event details">
            <span>{preset.summaryLead}</span>
            <span>{preset.summaryTimeLabel}</span>
          </div>
        </div>
      ) : null}

      <div className="mario-event-spotlight-art" aria-hidden="true">
        <img className="mario-event-spotlight-silhouette" src={marioSilhouette} alt="" />
        <img className="mario-event-spotlight-mushroom" src={mushroomImage} alt="" />
      </div>
    </section>
  );
}
