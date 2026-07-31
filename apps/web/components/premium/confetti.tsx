'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';

/**
 * Confetti burst for success states (booking confirmed, admitted).
 * Anime.js particle system on a fixed overlay. No-op under reduced motion.
 */
export function Confetti({ trigger = true }: { trigger?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!trigger || !canvasRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Source colors from the design tokens (OKLCH) so they match the brand.
    const token = (name: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || 'rgb(0,51,102)';
    const colors = [
      token('--color-irctc-700'),
      token('--color-orange-500'),
      token('--color-orange-400'),
      token('--color-irctc-500'),
      token('--color-orange-300'),
      token('--color-irctc-400'),
    ];
    const pieces = Array.from({ length: 140 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 80,
      y: window.innerHeight * 0.35,
      angle: Math.random() * Math.PI * 2,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 18,
      vy: -(Math.random() * 14 + 6),
      rot: (Math.random() - 0.5) * 0.4,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.angle += p.rot;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    };

    // Drive the draw loop via Anime.js so it stays on the rAF clock.
    const anim = anime({
      targets: { p: 0 },
      p: 1,
      duration: 2600,
      easing: 'easeOutQuad',
      update: () => draw(),
      complete: () => ctx.clearRect(0, 0, canvas.width, canvas.height),
    });

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    return () => {
      anim.pause();
      window.removeEventListener('resize', onResize);
    };
  }, [trigger]);

  if (!trigger) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[70]"
      aria-hidden="true"
    />
  );
}
