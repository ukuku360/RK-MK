import { useEffect, useState } from 'react';

export function PingPongRain({ active }: { active: boolean }) {
  const [balls, setBalls] = useState<{ id: number; left: number; delay: number; duration: number; size: number; isPaddle: boolean }[]>([]);

  useEffect(() => {
    if (active) {
      // Generate balls
      const newBalls = Array.from({ length: 120 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2.5, // 0 to 2.5s falls over the 2.8s duration
        duration: 0.8 + Math.random() * 1.5, // fast falling
        size: 12 + Math.random() * 24, // 12-36px
        isPaddle: Math.random() > 0.85, // 15% chance to be a paddle instead
      }));
      setBalls(newBalls);
    } else {
      setBalls([]);
    }
  }, [active]);

  if (!active) return null;

  return (
    <>
      <style>{`
        .ping-pong-rain-entity {
          position: fixed;
          top: -100px;
          z-index: 10001;
          pointer-events: none;
          animation: rainDown linear forwards;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .ping-pong-ball {
          background: #fff;
          border: 3px solid #171717;
          border-radius: 50%;
          box-shadow: 2px 2px 0 rgba(0,0,0,0.5);
        }
        @keyframes rainDown {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(120vh) rotate(1080deg); opacity: 0; }
        }
      `}</style>
      {balls.map((b) => (
        <div
          key={b.id}
          className={`ping-pong-rain-entity ${!b.isPaddle ? 'ping-pong-ball' : ''}`}
          style={{
            left: `${b.left}vw`,
            width: b.isPaddle ? 'auto' : b.size,
            height: b.isPaddle ? 'auto' : b.size,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`
          }}
        >
          {b.isPaddle ? '🏓' : ''}
        </div>
      ))}
    </>
  );
}
