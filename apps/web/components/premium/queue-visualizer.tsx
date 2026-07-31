'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';

/**
 * Animated queue position ring — SVG stroke drawn via Anime.js.
 * Shows position / total as a circular progress gauge.
 * GPU-friendly (stroke-dashoffset only). Reduced-motion safe.
 */
export function QueueVisualizer({
  position,
  total,
  size = 180,
}: {
  position: number;
  total: number;
  size?: number;
}) {
  const circleRef = useRef<SVGCircleElement>(null);
  const prevPos = useRef(position);

  const progress = total > 0 ? Math.min(Math.max(1 - position / total, 0), 1) : 0;
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.strokeDashoffset = String(circumference * (1 - progress));
      return;
    }

    // Animate the ring from previous to new progress.
    const from = total > 0 ? Math.max(1 - prevPos.current / total, 0) : 0;
    anime({
      targets: { v: from },
      v: progress,
      duration: 800,
      easing: 'easeOutCubic',
      update: (a) => {
        el.style.strokeDashoffset = String(circumference * (1 - Number(a.animations[0].currentValue)));
      },
    });
    prevPos.current = position;
  }, [position, total, progress, circumference]);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Queue position ${position} of ${total}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="10"
        />
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#queueGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
        <defs>
          <linearGradient id="queueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-irctc-500)" />
            <stop offset="100%" stopColor="var(--color-orange-500)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-black tabular-nums text-foreground">
          {position}
        </span>
        <span className="text-xs text-muted-foreground">
          of {total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
