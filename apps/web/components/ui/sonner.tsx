'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * Premium toast host — theme-aware (light/dark via next-themes),
 * rich colors for success/error, dismissible.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--success-bg': 'var(--success)',
          '--success-text': 'var(--success-foreground)',
          '--error-bg': 'var(--destructive)',
          '--error-text': 'var(--destructive-foreground)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
