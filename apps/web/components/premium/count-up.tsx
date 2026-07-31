'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import anime from 'animejs';

/**
 * Animated number counter — counts from 0 to `to` when scrolled into view.
 * Powered by Anime.js (compulsory). Respects reduced motion (jumps to final).
 * Only transforms numbers, never layout.
 */
export function CountUp({
  to,
  duration = 1600,
  format = (n: number) => Math.round(n).toLocaleString(),
  className,
}: {
  to: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  // Start at the FINAL value so SSR/no-JS always shows the real number.
  const [value, setValue] = useState(to);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!inView || animated) return;
    setAnimated(true);

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return; // already showing final value

    const anim = anime({
      targets: { v: 0 },
      v: to,
      duration,
      easing: 'easeOutExpo',
      update: (a) => setValue(Number(a.animations[0].currentValue)),
    });

    return () => anim.pause();
  }, [inView, animated, to, duration]);

  return (
    <span ref={ref} className={className} aria-label={format(to)}>
      {format(value)}
    </span>
  );
}
