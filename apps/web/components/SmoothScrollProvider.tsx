'use client';

import { ReactLenis, useLenis, type LenisRef } from 'lenis/react';
import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Disables Lenis entirely when the user prefers reduced motion.
 * Per the lenis skill rule: do not soften — stop smooth scroll completely.
 */
function SmoothScrollController({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    if (reduceMotion) lenis.stop();
    else lenis.start();
  }, [reduceMotion, lenis]);

  return <>{children}</>;
}

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  return (
    <ReactLenis
      ref={lenisRef}
      root
      options={{
        duration: 1.1,
        lerp: 0.1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
        infinite: false,
        autoRaf: true,
      }}
    >
      <SmoothScrollController>{children}</SmoothScrollController>
    </ReactLenis>
  );
}
