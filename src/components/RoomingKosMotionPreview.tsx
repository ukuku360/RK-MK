import { useEffect, useState, type CSSProperties } from 'react';
import roomingKosWordmark from '../../ROOMINGKOS BRANDING/Logo/PNG/Copy of RK_Brandmark_RED_CMYK.png';
import manifest from '../assets/roomingkos-wordmark-slices/manifest.json';

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

  const isDot = component.id === 'slice-06';

  return {
    ...component,
    source,
    isDot,
    left: (component.x / manifest.bounds.width) * 100,
    top: (component.y / manifest.bounds.height) * 100,
    width: (component.width / manifest.bounds.width) * 100,
    height: (component.height / manifest.bounds.height) * 100,
    enterDelay: isDot ? 0.96 : index * 0.085,
    tilt: index % 2 === 0 ? -2.2 : 2.2,
    dropHeight: isDot ? 255 : 0,
  };
});

const dotSlice =
  assetSlices.find((slice) => slice.id === 'slice-06') ??
  (() => {
    throw new Error('Missing RoomingKos dot slice asset.');
  })();

const slices = assetSlices.filter((slice) => slice.id !== 'slice-06');

const wordBounds = slices.reduce(
  (bounds, slice) => ({
    left: Math.min(bounds.left, slice.left),
    right: Math.max(bounds.right, slice.left + slice.width),
  }),
  { left: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY },
);

const wordWidth = wordBounds.right - wordBounds.left;
const lineWidth = wordWidth * 1.05;
const lineLeft = wordBounds.left - (wordWidth * 0.025);
const lineTop = 106;

const bounceSpan = wordWidth * 0.65;
const bounceStart = wordBounds.left + (wordWidth - bounceSpan) / 2;
const impactTop = lineTop - dotSlice.height * 0.62;

const ballPath = {
  startLeft: bounceStart - 10,
  startTop: -40,
  impactOneLeft: bounceStart + bounceSpan * 0.16,
  impactOneTop: impactTop,
  peakOneLeft: bounceStart + bounceSpan * 0.32,
  peakOneTop: -15,
  impactTwoLeft: bounceStart + bounceSpan * 0.50,
  impactTwoTop: impactTop + 0.3,
  peakTwoLeft: bounceStart + bounceSpan * 0.65,
  peakTwoTop: 15,
  impactThreeLeft: bounceStart + bounceSpan * 0.78,
  impactThreeTop: impactTop + 0.7,
  peakThreeLeft: dotSlice.left + 6,
  peakThreeTop: dotSlice.top - 45,
  settlePrepLeft: dotSlice.left,
  settlePrepTop: dotSlice.top + 1.2,
  finalLeft: dotSlice.left,
  finalTop: dotSlice.top,
};

const formatPercent = (value: number) => `${value.toFixed(3)}%`;

export function RoomingKosMotionPreview() {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const cycleTimer = window.setInterval(() => {
      setCycle((currentCycle) => currentCycle + 1);
    }, 10000);

    return () => {
      window.clearInterval(cycleTimer);
    };
  }, []);

  return (
    <div className="hero-banner" aria-label="Animated Pinging RoomingKos Logo">
      <div 
        className="roomingkos-slice-scene" 
        style={{ 
          width: '85%', 
          margin: '0 auto', 
          paddingTop: '6%', 
          paddingBottom: '3%' 
        }}
      >
        <div
          key={cycle}
          className="roomingkos-slice-track"
                style={
                  {
                    aspectRatio: `${manifest.bounds.width} / ${manifest.bounds.height}`,
                    '--dot-left': `${dotSlice.left}%`,
                    '--dot-top': `${dotSlice.top}%`,
                    '--dot-width': `${dotSlice.width}%`,
                    '--dot-height': `${dotSlice.height}%`,
                    '--line-left': formatPercent(lineLeft),
                    '--line-top': formatPercent(lineTop),
                    '--line-width': formatPercent(lineWidth),
                    '--ball-start-left': formatPercent(ballPath.startLeft),
                    '--ball-start-top': formatPercent(ballPath.startTop),
                    '--ball-impact-one-left': formatPercent(ballPath.impactOneLeft),
                    '--ball-impact-one-top': formatPercent(ballPath.impactOneTop),
                    '--ball-peak-one-left': formatPercent(ballPath.peakOneLeft),
                    '--ball-peak-one-top': formatPercent(ballPath.peakOneTop),
                    '--ball-impact-two-left': formatPercent(ballPath.impactTwoLeft),
                    '--ball-impact-two-top': formatPercent(ballPath.impactTwoTop),
                    '--ball-peak-two-left': formatPercent(ballPath.peakTwoLeft),
                    '--ball-peak-two-top': formatPercent(ballPath.peakTwoTop),
                    '--ball-impact-three-left': formatPercent(ballPath.impactThreeLeft),
                    '--ball-impact-three-top': formatPercent(ballPath.impactThreeTop),
                    '--ball-peak-three-left': formatPercent(ballPath.peakThreeLeft),
                    '--ball-peak-three-top': formatPercent(ballPath.peakThreeTop),
                    '--ball-settle-prep-left': formatPercent(ballPath.settlePrepLeft),
                    '--ball-settle-prep-top': formatPercent(ballPath.settlePrepTop),
                  } as CSSProperties
                }
              >
                <div className="roomingkos-underline" aria-hidden="true" />
                <span className="roomingkos-ball-shadow" aria-hidden="true" />
                <span className="roomingkos-ball" aria-hidden="true">
                  <span className="roomingkos-ball-core roomingkos-ball-core--white" />
                  <span className="roomingkos-ball-core roomingkos-ball-core--red">
                    <img src={dotSlice.source} alt="" />
                  </span>
                </span>
                {slices.map((slice) => (
                  <span
                    key={slice.id}
                    className="roomingkos-slice"
                    style={
                      {
                        '--slice-left': `${slice.left}%`,
                        '--slice-top': `${slice.top}%`,
                        '--slice-width': `${slice.width}%`,
                        '--slice-height': `${slice.height}%`,
                        '--slice-enter-delay': `${slice.enterDelay}s`,
                        '--slice-tilt': `${slice.tilt}deg`,
                      } as CSSProperties
                    }
                  >
                    <span className="roomingkos-slice-inner">
                      <img src={slice.source} alt="" />
                    </span>
                  </span>
                ))}
        </div>
      </div>
    </div>
  );
}
