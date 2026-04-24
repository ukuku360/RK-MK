import { useEffect, useState, type CSSProperties } from 'react';
import manifest from '../assets/roomingkos-wordmark-slices/manifest.json';

const LOOP_DURATION_MS = 10000;

const sliceModules = import.meta.glob('../assets/roomingkos-wordmark-slices/slice-*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

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
    revealDelay: isDot ? 0.72 : isStem ? 0.52 : 0.16 + index * 0.065,
    enterX: isDot ? 0 : direction * (8 + (index % 3) * 3.5),
    enterY:
      isDot
        ? -32
        : isStem
          ? 18
          : verticalBias === 0
            ? 8 + (index % 2) * 4
            : verticalBias * (12 + (index % 2) * 4),
    rotation: isDot ? -10 : isStem ? 7 : direction * (6 + (index % 3) * 2.5),
    waveDuration: `${3.2 + (index % 4) * 0.22}s`,
    waveDelay: `${0.9 + index * 0.06}s`,
    waveY: `${1.8 + (index % 3) * 0.55}px`,
    waveRotate: `${direction * (0.8 + (index % 2) * 0.35)}deg`,
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
    <div className="hero-banner" aria-label="RoomingKos Mario Kart racing banner">
      <div className="roomingkos-slice-scene">
        <div key={cycle} className="rk-race-scene">
          <div className="rk-start-lights" aria-hidden="true">
            <span className="rk-start-light rk-start-light--1" />
            <span className="rk-start-light rk-start-light--2" />
            <span className="rk-start-light rk-start-light--3" />
          </div>

          <div className="rk-wordmark-zone" style={{ aspectRatio: wordmarkAspectRatio }} aria-hidden="true">
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
                    '--slice-wave-duration': slice.waveDuration,
                    '--slice-wave-delay': slice.waveDelay,
                    '--slice-wave-y': slice.waveY,
                    '--slice-wave-rotate': slice.waveRotate,
                  } as CSSProperties
                }
              >
                <span className="rk-wordmark-slice-inner">
                  <img src={slice.source} alt="" />
                </span>
              </span>
            ))}
          </div>

          <div className="rk-race-track rk-race-track--static" aria-hidden="true">
            <span className="rk-race-track-rail rk-race-track-rail--left" />
            <span className="rk-race-track-rail rk-race-track-rail--right" />
            <span className="rk-boost-strip" />
            <span className="rk-finish-strip" />
          </div>
        </div>
      </div>
    </div>
  );
}
