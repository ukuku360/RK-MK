import { useEffect, useState, type CSSProperties } from 'react';
import manifest from '../../assets/spire-wordmark-slices/manifest.json';

const LOOP_DURATION_MS = 10000;

const sliceModules = import.meta.glob('../../assets/spire-wordmark-slices/slice-*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const letterMotion = [
  { enterX: -28, enterY: 18, rotation: -12, delay: 2.28 },
  { enterX: -10, enterY: -20, rotation: 9, delay: 2.42 },
  { enterX: 0, enterY: 28, rotation: -6, delay: 2.56 },
  { enterX: 12, enterY: -18, rotation: 8, delay: 2.7 },
  { enterX: 30, enterY: 16, rotation: 12, delay: 2.84 },
] as const;

const assetSlices = manifest.components.map((component, index) => {
  const modulePath = `../../assets/spire-wordmark-slices/${component.file}`;
  const source = sliceModules[modulePath];
  const motion = letterMotion[index] ?? letterMotion[letterMotion.length - 1];

  if (!source) {
    throw new Error(`Missing Spire slice asset: ${modulePath}`);
  }

  const left = (component.x / manifest.bounds.width) * 100;
  const top = (component.y / manifest.bounds.height) * 100;
  const width = (component.width / manifest.bounds.width) * 100;
  const height = (component.height / manifest.bounds.height) * 100;

  return {
    ...component,
    source,
    left,
    top,
    width,
    height,
    revealDelay: motion.delay,
    enterX: motion.enterX,
    enterY: motion.enterY,
    rotation: motion.rotation,
    zIndex: 12 + index,
  };
});

const wordmarkAspectRatio = `${manifest.bounds.width} / ${manifest.bounds.height}`;

export function SpireMotionPreview() {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const cycleTimer = window.setInterval(() => {
      setCycle((currentCycle) => currentCycle + 1);
    }, LOOP_DURATION_MS);

    return () => {
      window.clearInterval(cycleTimer);
    };
  }, []);

  return (
    <div className="spire-motion-banner" aria-label="Animated Spire Mario Kart banner">
      <div className="spire-motion-scene">
        <div key={cycle} className="spire-race-scene">
          <div className="spire-start-lights" aria-hidden="true">
            <span className="spire-start-light spire-start-light--1" />
            <span className="spire-start-light spire-start-light--2" />
            <span className="spire-start-light spire-start-light--3" />
          </div>

          <div className="spire-wordmark-zone" style={{ aspectRatio: wordmarkAspectRatio }}>
            <span className="spire-wordmark-glow" aria-hidden="true" />
            {assetSlices.map((slice) => (
              <span
                key={slice.id}
                className="spire-wordmark-slice"
                style={
                  {
                    left: `${slice.left}%`,
                    top: `${slice.top}%`,
                    width: `${slice.width}%`,
                    height: `${slice.height}%`,
                    zIndex: slice.zIndex,
                    '--slice-enter-x': `${slice.enterX}%`,
                    '--slice-enter-y': `${slice.enterY}%`,
                    '--slice-rotation': `${slice.rotation}deg`,
                    '--slice-delay': `${slice.revealDelay}s`,
                  } as CSSProperties
                }
                aria-hidden="true"
              >
                <span className="spire-wordmark-slice-inner">
                  <img src={slice.source} alt="" />
                </span>
              </span>
            ))}
          </div>

          <div className="spire-race-track" aria-hidden="true">
            <span className="spire-race-track-rail spire-race-track-rail--left" />
            <span className="spire-race-track-rail spire-race-track-rail--right" />
            <span className="spire-boost-strip" />
            <span className="spire-finish-strip" />
          </div>
        </div>
      </div>
    </div>
  );
}
