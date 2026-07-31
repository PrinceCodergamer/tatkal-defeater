'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';

/**
 * Circular countdown gauge — SVG arc animating with time remaining.
 * Anime.js stroke-dashoffset, reduced-motion safe. Transform-only.
 */
export function CountdownRing({
  seconds,
  total,
  urgency = 'normal',
  size = 120,
}: {
  seconds: number;
  total: number;
  urgency?: 'normal' | 'urgent' | 'critical';
  size?: number;
}) {
  const ringRef = useRef<SVGCircleElement>(null);
  const progress = Math.max(Math.min(seconds / total, 1), 0);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;

  // Color by urgency — always contrast-safe.
  const strokeColor =
    urgency === 'critical'
      ? 'var(--destructive)'
      : urgency === 'urgent'
        ? 'var(--color-orange-500)'
        : 'var(--color-irctc-500)';

  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.strokeDashoffset = String(circumference * (1 - progress));
      return;
    }
    anime({
      targets: { v: circumference * (1 - progress) },
      v: circumference * (1 - progress),
      duration: 600,
      easing: 'easeOutCubic',
      update: (a) => {
        el.style.strokeDashoffset = String(a.animations[0].currentValue);
      },
    });
  }, [progress, circumference]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
        />
        <circle
          ref={ringRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-black tabular-nums text-foreground">
          {seconds}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">sec</span>
      </div>
    </div>
  );
}
