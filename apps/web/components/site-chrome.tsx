'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ScrollProgressBar } from '@/components/scroll-effects';
import { PageTransition } from '@/components/page-transition';
import type { ReactNode } from 'react';

/**
 * Renders the site chrome (header / footer / scroll bar) except on the
 * cinematic /experience route, where the stage must be immersive and clean.
 * PageTransition is also skipped on /experience — its transform wrapper
 * would break GSAP's position:fixed pinning.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isExperience = pathname === '/experience';

  if (isExperience) {
    return <>{children}</>;
  }

  return (
    <>
      <ScrollProgressBar />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main id="main-content" className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
      </div>
    </>
  );
}
