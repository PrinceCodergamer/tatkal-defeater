'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Route-level skeletons — on-palette (irctc shimmer token), dark-mode safe.
 * Minimal markup, correct proportions, no layout shift.
 */

export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero block */}
      <div className="h-[420px] bg-gradient-to-br from-irctc-900 via-irctc-800 to-irctc-950" />
      {/* Search card region */}
      <div className="mx-auto -mt-10 max-w-[1200px] px-4">
        <div className="irctc-card space-y-4 p-6">
          <Skeleton className="h-5 w-40" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      {/* Cards region */}
      <div className="mx-auto mt-8 max-w-[1200px] px-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function WaitingRoomSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="irctc-card space-y-6 p-8">
          <Skeleton className="mx-auto h-5 w-48" />
          <Skeleton className="mx-auto h-40 w-40 rounded-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="mx-auto h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function BookingSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="irctc-card space-y-6 p-8">
          <Skeleton className="mx-auto h-5 w-40" />
          <Skeleton className="mx-auto h-24 w-24 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
