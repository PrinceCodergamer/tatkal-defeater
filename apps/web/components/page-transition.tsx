'use client';

import { motion } from 'framer-motion';

/**
 * Page transition wrapper — fades + rises content on route change.
 * Wrap around the routed page content in layout. Reduced-motion safe
 * (framer-motion respects prefers-reduced-motion via useReducedMotion
 * internally for duration, and the global CSS kill-switch applies too).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
