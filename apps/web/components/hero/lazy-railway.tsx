'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

/**
 * Lazy-loaded Three.js railway network.
 * - The heavy three/@react-three/fiber bundle is code-split and only
 *   requested once this component mounts (below the fold in the hero).
 * - Fully disabled under prefers-reduced-motion → static gradient backdrop.
 * - Suspense fallback is a null (the hero gradient shows through).
 */
const RailwayNetwork = dynamic(() =>
  import('./railway-network').then((m) => m.RailwayNetwork),
  {
    ssr: false,
    loading: () => null,
  },
);

export function LazyRailway({ className = '' }: { className?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return; // stay disabled — static fallback
    // Defer until browser is idle so LCP isn't blocked by the 3D bundle.
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(() => setEnabled(true), { timeout: 1500 })
      : window.setTimeout(() => setEnabled(true), 500);
    return () =>
      window.cancelIdleCallback
        ? window.cancelIdleCallback(id)
        : window.clearTimeout(id as number);
  }, []);

  if (!enabled) return null;

  return <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true"><RailwayNetwork /></div>;
}
