import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

export function ClickParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Don't spawn if clicking the paddle itself or similar UI
      const target = e.target as HTMLElement;
      if (target.closest('.draw-toggle') || target.tagName === 'BUTTON') {
        // We can still spawn, but let's make it universal
      }

      const newParticles: Particle[] = Array.from({ length: 3 }).map((_, i) => ({
        id: Date.now() + i + Math.random(),
        startX: e.clientX,
        startY: e.clientY,
        targetX: (Math.random() - 0.5) * 80, // travel distance X
        targetY: (Math.random() - 0.5) * 80 - 20, // travel distance Y (bias upward)
      }));

      setParticles((prev) => [...prev, ...newParticles]);

      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
      }, 500);
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <>
      <style>{`
        .click-particle {
          position: fixed;
          width: 14px;
          height: 14px;
          background: #fff;
          border: 3px solid #171717;
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
          animation: particleFade 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        @keyframes particleFade {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1.2); opacity: 0; }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="click-particle"
          style={{
            left: p.startX,
            top: p.startY,
            '--tx': `calc(-50% + ${p.targetX}px)`,
            '--ty': `calc(-50% + ${p.targetY}px)`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}
