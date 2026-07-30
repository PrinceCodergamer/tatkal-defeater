'use client';

import { ReactNode } from 'react';
import { SmoothScrollProvider } from '@/components/SmoothScrollProvider';

export function Providers({ children }: { children: ReactNode }) {
  return <SmoothScrollProvider>{children}</SmoothScrollProvider>;
}
