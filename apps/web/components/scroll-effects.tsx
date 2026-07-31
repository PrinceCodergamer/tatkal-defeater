'use client';

import { motion, useScroll, useSpring, useTransform, useReducedMotion, type MotionValue } from 'framer-motion';
import { useLenis } from 'lenis/react';
import { useRef, type ReactNode } from 'react';

/**
 * Top-of-page scroll progress bar.
 * Driven by framer-motion's useScroll, which reads window scroll
 * (Lenis animates native scroll, so they compose cleanly on root).
 * Transforms only — GPU-composited, no layout thrash.
 */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-irctc-600 via-irctc-500 to-orange-500"
      style={{ scaleX }}
    />
  );
}

/**
 * Lenis-native scroll velocity as a framer-motion MotionValue.
 * Fires on Lenis' own rAF loop — no separate scroll listener, no throttle needed.
 * Respects reduced motion (velocity stays 0 when smooth scroll is stopped).
 */
export function useLenisVelocity(): MotionValue<number> {
  const velocity = useSpring(0, { stiffness: 400, damping: 60, restDelta: 0.001 });
  useLenis((lenis) => {
    velocity.set(lenis.velocity);
  });
  return velocity;
}

/**
 * Parallax wrapper. Children translate at `speed` × scroll progress of the
 * element's viewport crossing. Only `transform` is animated.
 * Falls back to static when reduced motion is preferred.
 */
export function Parallax({
  children,
  speed = 0.3,
  className = '',
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [speed * 60, speed * -60]);
  return (
    <motion.div ref={ref} className={className} style={{ y: reduceMotion ? 0 : y }}>
      {children}
    </motion.div>
  );
}

/**
 * Reveal-on-scroll: fade + rise as the element enters the viewport.
 * Uses whileInView (IntersectionObserver-backed) — no scroll listener.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
