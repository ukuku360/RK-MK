import { useEffect, useState, type CSSProperties } from 'react';
import roomingKosWordmark from '../assets/branding/roomingkos/rk-wordmark.png';
import manifest from '../assets/roomingkos-wordmark-slices/manifest.json';

const LOOP_DURATION_MS = 10000;

const sliceModules = import.meta.glob('../assets/roomingkos-wordmark-slices/slice-*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const speedLines = [
  { left: 4, top: 14, width: 15, delay: 1.5, duration: 0.62 },
  { left: 19, top: 8, width: 10, delay: 1.68, duration: 0.56 },
  { left: 33, top: 16, width: 14, delay: 1.82, duration: 0.7 },
  { left: 57, top: 11, width: 12, delay: 1.94, duration: 0.58 },
  { left: 73, top: 18, width: 16, delay: 2.08, duration: 0.74 },
  { left: 86, top: 9, width: 9, delay: 2.16, duration: 0.52 },
] as const;

const driftMarks = [
  { left: 27, top: 68, width: 14, rotate: -14, delay: 3.2 },
  { left: 35, top: 66, width: 18, rotate: -10, delay: 3.34 },
  { left: 45, top: 65, width: 20, rotate: -4, delay: 3.48 },
  { left: 55, top: 66, width: 17, rotate: 6, delay: 3.62 },
  { left: 63, top: 67, width: 13, rotate: 12, delay: 3.76 },
] as const;

const smokePuffs = [
  { left: 39, top: 57, size: 8, delay: 3.42 },
  { left: 46, top: 54, size: 10, delay: 3.52 },
  { left: 54, top: 56, size: 9, delay: 3.64 },
  { left: 60, top: 59, size: 7, delay: 3.78 },
] as const;

const sparks = [
  { left: 44, top: 67, size: 1.5, delay: 3.38 },
  { left: 47, top: 63, size: 1.25, delay: 3.45 },
  { left: 51, top: 68, size: 1.1, delay: 3.54 },
  { left: 55, top: 64, size: 1.35, delay: 3.62 },
  { left: 58, top: 68, size: 1.15, delay: 3.71 },
] as const;

const coins = [
  { left: 61, top: 24, size: 6.5, delay: 4.85 },
  { left: 69, top: 18, size: 7, delay: 5.08 },
  { left: 78, top: 25, size: 6.3, delay: 5.28 },
] as const;

const itemBoxes = [
  { left: 17, top: 31, size: 9, delay: 4.72 },
  { left: 83, top: 30, size: 8.5, delay: 5.18 },
] as const;

const checkerTiles = Array.from({ length: 10 }, (_, index) => index);

const assetSlices = manifest.components.map((component, index) => {
  const modulePath = `../assets/roomingkos-wordmark-slices/${component.file}`;
  const source = sliceModules[modulePath];

  if (!source) {
    throw new Error(`Missing RoomingKos slice asset: ${modulePath}`);
  }

  const left = (component.x / manifest.bounds.width) * 100;
  const top = (component.y / manifest.bounds.height) * 100;
  const width = (component.width / manifest.bounds.width) * 100;
  const height = (component.height / manifest.bounds.height) * 100;
  const centerX = left + width / 2;
  const isDot = component.id === 'slice-06';
  const isStem = component.id === 'slice-07';
  const direction = centerX < 50 ? -1 : 1;
  const verticalBias = top < 18 ? -1 : top > 24 ? 1 : 0;

  return {
    ...component,
    source,
    left,
    top,
    width,
    height,
    isDot,
    isStem,
    revealDelay: isDot ? 3.62 : isStem ? 3.32 : 2.62 + index * 0.082,
    enterX: isDot ? 0 : direction * (8 + (index % 3) * 3.5),
    enterY:
      isDot
        ? -42
        : isStem
          ? 24
          : verticalBias === 0
            ? 10 + (index % 2) * 4
            : verticalBias * (16 + (index % 2) * 5),
    rotation: isDot ? -12 : isStem ? 8 : direction * (8 + (index % 3) * 3),
    zIndex: isDot ? 18 : isStem ? 17 : 10 + index,
  };
});

const wordmarkAspectRatio = `${manifest.bounds.width} / ${manifest.bounds.height}`;

export function RoomingKosMotionPreview() {
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
    <div className="hero-banner" aria-label="Animated RoomingKos Mario Kart racing banner">
      <div className="roomingkos-slice-scene">
        <div key={cycle} className="rk-race-scene">
          <div className="rk-race-speedlines" aria-hidden="true">
            {speedLines.map((line, index) => (
              <span
                key={`line-${index}`}
                className={`rk-race-speedline${index > 3 ? ' rk-race-decor--secondary' : ''}`}
                style={
                  {
                    '--speed-left': `${line.left}%`,
                    '--speed-top': `${line.top}%`,
                    '--speed-width': `${line.width}%`,
                    '--speed-delay': `${line.delay}s`,
                    '--speed-duration': `${line.duration}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className="rk-start-lights" aria-hidden="true">
            <span className="rk-start-light rk-start-light--1" />
            <span className="rk-start-light rk-start-light--2" />
            <span className="rk-start-light rk-start-light--3" />
          </div>

          <div className="rk-checker-banner" aria-hidden="true">
            {checkerTiles.map((tile) => (
              <span key={tile} className="rk-checker-banner-tile" />
            ))}
          </div>

          {itemBoxes.map((item, index) => (
            <span
              key={`item-${index}`}
              className={`rk-item-box${index === 0 ? ' rk-race-decor--secondary' : ''}`}
              style={
                {
                  '--item-left': `${item.left}%`,
                  '--item-top': `${item.top}%`,
                  '--item-size': `${item.size}%`,
                  '--item-delay': `${item.delay}s`,
                } as CSSProperties
              }
              aria-hidden="true"
            >
              <span className="rk-item-box-core" />
            </span>
          ))}

          {coins.map((coin, index) => (
            <span
              key={`coin-${index}`}
              className={`rk-coin${index === coins.length - 1 ? ' rk-race-decor--secondary' : ''}`}
              style={
                {
                  '--coin-left': `${coin.left}%`,
                  '--coin-top': `${coin.top}%`,
                  '--coin-size': `${coin.size}%`,
                  '--coin-delay': `${coin.delay}s`,
                } as CSSProperties
              }
              aria-hidden="true"
            />
          ))}

          <div className="rk-wordmark-zone" style={{ aspectRatio: wordmarkAspectRatio }}>
            <span className="rk-wordmark-glow" aria-hidden="true" />
            <img src={roomingKosWordmark} className="rk-wordmark-aura" alt="" />
            {assetSlices.map((slice) => (
              <span
                key={slice.id}
                className={`rk-wordmark-slice${slice.isDot ? ' rk-wordmark-slice--dot' : ''}${
                  slice.isStem ? ' rk-wordmark-slice--stem' : ''
                }`}
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
                <span className="rk-wordmark-slice-inner">
                  <img src={slice.source} alt="" />
                </span>
              </span>
            ))}
          </div>

          <div className="rk-race-track" aria-hidden="true">
            <span className="rk-race-track-rail rk-race-track-rail--left" />
            <span className="rk-race-track-rail rk-race-track-rail--right" />
            <span className="rk-boost-strip" />
            <span className="rk-finish-strip" />
          </div>

          <div className="rk-drift-trail" aria-hidden="true">
            {driftMarks.map((mark, index) => (
              <span
                key={`trail-${index}`}
                className="rk-drift-mark"
                style={
                  {
                    '--trail-left': `${mark.left}%`,
                    '--trail-top': `${mark.top}%`,
                    '--trail-width': `${mark.width}%`,
                    '--trail-rotate': `${mark.rotate}deg`,
                    '--trail-delay': `${mark.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className="rk-drift-smoke" aria-hidden="true">
            {smokePuffs.map((puff, index) => (
              <span
                key={`smoke-${index}`}
                className="rk-drift-smoke-puff"
                style={
                  {
                    '--puff-left': `${puff.left}%`,
                    '--puff-top': `${puff.top}%`,
                    '--puff-size': `${puff.size}%`,
                    '--puff-delay': `${puff.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className="rk-drift-sparks" aria-hidden="true">
            {sparks.map((spark, index) => (
              <span
                key={`spark-${index}`}
                className="rk-drift-spark"
                style={
                  {
                    '--spark-left': `${spark.left}%`,
                    '--spark-top': `${spark.top}%`,
                    '--spark-size': `${spark.size}vw`,
                    '--spark-delay': `${spark.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className="rk-kart" aria-hidden="true">
            <span className="rk-kart-shadow" />
            <span className="rk-kart-wheel rk-kart-wheel--rear" />
            <span className="rk-kart-wheel rk-kart-wheel--front" />
            <span className="rk-kart-body">
              <span className="rk-kart-nose" />
              <span className="rk-kart-canopy" />
              <span className="rk-kart-seat" />
              <span className="rk-kart-booster" />
              <span className="rk-kart-flame" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
