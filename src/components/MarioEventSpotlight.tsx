import mushroomImage from '../assets/mk/mushroom.png';
import marioSilhouette from '../assets/mk/super-mario-56.svg';
import type { BrandVariant, EventPreset } from '../types';

interface MarioEventSpotlightProps {
  brandVariant: BrandVariant;
  buildingLabel: string;
  preset: EventPreset;
}

export function MarioEventSpotlight({
  brandVariant,
  buildingLabel,
  preset,
}: MarioEventSpotlightProps) {
  const isSpire = brandVariant === 'spire';

  return (
    <section
      className={`mario-event-spotlight mario-event-spotlight-${brandVariant}`}
      aria-label="Mario Kart event spotlight"
    >
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

      <div className="mario-event-spotlight-art" aria-hidden="true">
        <img className="mario-event-spotlight-silhouette" src={marioSilhouette} alt="" />
        <img className="mario-event-spotlight-mushroom" src={mushroomImage} alt="" />
      </div>
    </section>
  );
}
