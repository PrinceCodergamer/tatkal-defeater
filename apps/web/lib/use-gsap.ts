'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * GSAP scroll-reveal — fades + rises an element when it enters the viewport.
 * Uses ScrollTrigger (transform+opacity only). No-op under reduced motion.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: { y?: number; delay?: number } = {},
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: options.y ?? 32 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: options.delay ?? 0,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      },
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [options.y, options.delay]);

  return ref;
}

/**
 * GSAP parallax — element translates slower than scroll (depth illusion).
 * Transform-only, ScrollTrigger-synced.
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(speed = 0.25) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tween = gsap.fromTo(
      el,
      { y: speed * 80 },
      {
        y: speed * -80,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      },
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [speed]);

  return ref;
}
