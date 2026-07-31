'use client';

import { useRef, type ReactNode, type MouseEvent } from 'react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';

/**
 * Magnetic button — pulls toward the cursor using GSAP transforms.
 * Returns to rest on leave. Disabled under reduced motion (motion-dir rule).
 */
export function MagneticButton({
  children,
  className,
  strength = 0.3,
  ...props
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  const inner = useRef<HTMLSpanElement>(null);

  function handleMove(e: MouseEvent<HTMLButtonElement>) {
    if (!ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    gsap.to(inner.current, { x, y, duration: 0.4, ease: 'power3.out' });
  }

  function handleLeave() {
    if (!inner.current) return;
    gsap.to(inner.current, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  }

  return (
    <button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn('relative inline-flex', className)}
      {...props}
    >
      <span ref={inner} className="inline-flex items-center justify-center will-change-transform">
        {children}
      </span>
    </button>
  );
}
