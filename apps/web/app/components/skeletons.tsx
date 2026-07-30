'use client';

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      style={{ animationDuration: '1.5s' }}
    />
  );
}

export function HomePageSkeleton() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <Shimmer className="h-10 w-48 mx-auto" />
          <Shimmer className="h-4 w-72 mx-auto" />
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-12 w-full" />
          <Shimmer className="h-12 w-full" />
        </div>

        <div className="text-center space-y-2">
          <Shimmer className="h-3 w-56 mx-auto" />
          <Shimmer className="h-3 w-48 mx-auto" />
        </div>
      </div>
    </main>
  );
}

export function WaitingRoomSkeleton() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Shimmer className="h-8 w-48 mx-auto" />
          <Shimmer className="h-4 w-64 mx-auto" />
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm text-center space-y-4">
          <Shimmer className="h-16 w-24 mx-auto" />
          <Shimmer className="h-4 w-36 mx-auto" />
          <Shimmer className="h-2 w-full" />
          <div className="space-y-2">
            <Shimmer className="h-4 w-40 mx-auto" />
            <Shimmer className="h-4 w-44 mx-auto" />
          </div>
        </div>

        <Shimmer className="h-24 w-full rounded-lg" />

        <Shimmer className="h-10 w-full rounded-lg" />
      </div>
    </main>
  );
}

export function BookingSkeleton() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Shimmer className="h-8 w-48 mx-auto" />
          <Shimmer className="h-12 w-24 mx-auto" />
          <Shimmer className="h-4 w-56 mx-auto" />
        </div>

        <div className="rounded-xl border bg-white p-6 space-y-4">
          <Shimmer className="h-5 w-36" />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Shimmer className="h-6 w-6 rounded-full" />
              <Shimmer className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <Shimmer className="h-6 w-6 rounded-full" />
              <Shimmer className="h-4 w-40" />
            </div>
            <div className="flex items-center gap-3">
              <Shimmer className="h-6 w-6 rounded-full" />
              <Shimmer className="h-4 w-32" />
            </div>
          </div>
        </div>

        <Shimmer className="h-12 w-full rounded-lg" />
        <Shimmer className="h-16 w-full rounded-lg" />
      </div>
    </main>
  );
}
