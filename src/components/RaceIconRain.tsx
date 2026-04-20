import { useEffect, useState } from 'react';

const RACE_ICONS = ['🏁', '⭐', '🛞', '🍄', '⚡'];

interface RaceIcon {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  icon: string;
}

export function RaceIconRain({ active }: { active: boolean }) {
  const [icons, setIcons] = useState<RaceIcon[]>([]);

  useEffect(() => {
    if (active) {
      const nextIcons = Array.from({ length: 120 }).map((_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        duration: 0.8 + Math.random() * 1.5,
        size: 18 + Math.random() * 22,
        icon: RACE_ICONS[Math.floor(Math.random() * RACE_ICONS.length)],
      }));
      setIcons(nextIcons);
    } else {
      setIcons([]);
    }
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <>
      <style>{`
        .race-icon-rain-entity {
          position: fixed;
          top: -100px;
          z-index: 10001;
          pointer-events: none;
          animation: rainDown linear forwards;
          display: flex;
          align-items: center;
          justify-content: center;
          text-shadow: 2px 2px 0 rgba(0,0,0,0.35);
        }
        @keyframes rainDown {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(120vh) rotate(1080deg); opacity: 0; }
        }
      `}</style>
      {icons.map((icon) => (
        <div
          key={icon.id}
          className="race-icon-rain-entity"
          style={{
            left: `${icon.left}vw`,
            fontSize: `${icon.size}px`,
            animationDuration: `${icon.duration}s`,
            animationDelay: `${icon.delay}s`,
          }}
        >
          {icon.icon}
        </div>
      ))}
    </>
  );
}
