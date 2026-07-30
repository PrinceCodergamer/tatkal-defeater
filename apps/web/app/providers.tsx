'use client';

import { ReactNode } from 'react';
import { FeatureFlagsProvider } from '@/lib/feature-flags';

export function Providers({ children }: { children: ReactNode }) {
  return <FeatureFlagsProvider>{children}</FeatureFlagsProvider>;
}
