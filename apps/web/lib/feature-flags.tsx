'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { FeatureFlag, DEFAULT_FEATURE_FLAGS } from '@tatkal/shared';

interface FeatureFlagsContextType {
  flags: Record<string, boolean>;
  isEnabled: (flag: FeatureFlag) => boolean;
  refresh: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType>({
  flags: DEFAULT_FEATURE_FLAGS as unknown as Record<string, boolean>,
  isEnabled: () => false,
  refresh: async () => {},
});

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>(
    DEFAULT_FEATURE_FLAGS as unknown as Record<string, boolean>,
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/feature-flags');
      if (res.ok) {
        const data = await res.json();
        setFlags(data);
      }
    } catch {
      // Use defaults if API unavailable
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isEnabled = useCallback(
    (flag: FeatureFlag) => flags[flag] ?? DEFAULT_FEATURE_FLAGS[flag] ?? false,
    [flags],
  );

  return (
    <FeatureFlagsContext.Provider value={{ flags, isEnabled, refresh }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlag(flag: FeatureFlag): boolean {
  const ctx = useContext(FeatureFlagsContext);
  return ctx.isEnabled(flag);
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}
