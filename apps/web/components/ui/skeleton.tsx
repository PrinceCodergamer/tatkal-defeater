import { cn } from '@/lib/utils';

/**
 * On-palette skeleton loader using the irctc shimmer token.
 * Respects reduced motion (animation killed globally).
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('irctc-skeleton', className)} {...props} />;
}

export { Skeleton };
