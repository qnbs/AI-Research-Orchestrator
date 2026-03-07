/**
 * ParticleBackground — Ambient floating particle field
 *
 * Uses Framer Motion for per-particle drift animations.
 * Particles use CSS custom properties from the active theme so colours
 * automatically update when the user cycles themes.
 *
 * Performance: particles are static DOM nodes — no canvas API needed.
 * The component is memoised and never re-renders once mounted.
 */
import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;   // % from left
  y: number;   // % from top
  size: number; // px
  opacity: number;
  duration: number;
  delay: number;
  dxA: number; // keyframe drift A (px)
  dyA: number;
  dxB: number; // keyframe drift B (px)
  dyB: number;
  isAccent: boolean; // uses accent-cyan instead of brand-accent
}

// Seeded pseudo-random so SSR and client produce identical particles
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function buildParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const r = (offset: number) => seededRandom(i * 7 + offset);
    return {
      id: i,
      x: r(0) * 100,
      y: r(1) * 100,
      size: r(2) * 3 + 1,          // 1–4 px
      opacity: r(3) * 0.35 + 0.08, // 0.08–0.43
      duration: r(4) * 22 + 12,    // 12–34 s
      delay: r(5) * 8,             // 0–8 s
      dxA: (r(6) - 0.5) * 60,     // ±30 px
      dyA: (r(7) - 0.5) * 60,
      dxB: (r(8) - 0.5) * 40,
      dyB: (r(9) - 0.5) * 40,
      isAccent: r(10) > 0.75,
    };
  });
}

interface ParticleBackgroundProps {
  /** Number of particles to render (default: 45) */
  count?: number;
  /** Extra class names on the container */
  className?: string;
}

const ParticleBackgroundInner: React.FC<ParticleBackgroundProps> = ({
  count = 45,
  className = '',
}) => {
  const particles = useMemo(() => buildParticles(count), [count]);

  return (
    <div
      aria-hidden="true"
      className={`particle-field ${className}`}
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            // Colour from active theme CSS variables
            background: p.isAccent
              ? 'var(--color-accent-cyan)'
              : 'var(--color-brand-accent)',
            boxShadow: `0 0 ${p.size * 2}px var(--color-glow)`,
          }}
          animate={{
            x: [0, p.dxA, p.dxB, 0],
            y: [0, p.dyA, p.dyB, 0],
            opacity: [
              p.opacity,
              Math.min(p.opacity * 1.8, 0.7),
              p.opacity * 0.5,
              p.opacity,
            ],
            scale: [1, 1.3, 0.8, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}

      {/* Larger, slower "nebula" blobs for depth */}
      {[0, 1, 2].map((i) => {
        const r = (o: number) => seededRandom(i * 13 + o + 1000);
        return (
          <motion.span
            key={`blob-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${r(0) * 80 + 10}%`,
              top: `${r(1) * 80 + 10}%`,
              width: r(2) * 120 + 60,
              height: r(2) * 120 + 60,
              background: i % 2 === 0
                ? 'radial-gradient(circle, var(--color-brand-accent), transparent 70%)'
                : 'radial-gradient(circle, var(--color-accent-magenta), transparent 70%)',
              opacity: 0.04,
              filter: 'blur(30px)',
            }}
            animate={{
              x: [(r(3) - 0.5) * 80, (r(4) - 0.5) * 80, 0],
              y: [(r(5) - 0.5) * 60, (r(6) - 0.5) * 60, 0],
            }}
            transition={{
              duration: r(7) * 30 + 25,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: r(8) * 10,
            }}
          />
        );
      })}
    </div>
  );
};

export const ParticleBackground = memo(ParticleBackgroundInner);
