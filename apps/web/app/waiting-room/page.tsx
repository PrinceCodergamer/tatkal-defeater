'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useFeatureFlag } from '@/lib/feature-flags';
import { FeatureFlag } from '@tatkal/shared';
import { WaitingRoomSkeleton } from '../components/skeletons';

interface QueueStatus {
  position: number;
  totalWaiting: number;
  status: string;
}

function WaitingRoomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenId = searchParams.get('tokenId') || '';
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<QueueStatus>({
    position: parseInt(searchParams.get('position') || '0'),
    totalWaiting: parseInt(searchParams.get('total') || '0'),
    status: 'WAITING',
  });
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const showLotteryAnim = useFeatureFlag(FeatureFlag.LOTTERY_ANIMATION);

  useEffect(() => {
    if (!tokenId) {
      router.push('/');
      return;
    }

    setLoading(true);

    const socket = io('http://localhost:3001/queue', {
      query: { tokenId },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.emit('subscribe:position');

    socket.on('queue:update', (data: QueueStatus) => {
      setStatus(data);
      setLoading(false);
    });

    socket.on('queue:admitted', () => {
      router.push(`/booking?tokenId=${tokenId}`);
    });

    // Poll REST endpoint as fallback
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admission/status/${tokenId}`);
        const data = await res.json();
        setStatus(data);
        setLoading(false);
        if (data.status === 'ADMITTED') {
          clearInterval(pollInterval);
          router.push(`/booking?tokenId=${tokenId}`);
        }
      } catch {}
    }, 1000);

    // Time tracking
    const timer = setInterval(() => {
      setTimeElapsed((t) => t + 1);
    }, 1000);

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
      clearInterval(timer);
    };
  }, [tokenId, router]);

  if (loading) return <WaitingRoomSkeleton />;

  const progress = status.totalWaiting > 0
    ? ((status.totalWaiting - status.position) / status.totalWaiting) * 100
    : 0;

  const estimatedSeconds = Math.ceil(status.position / 500) * 60;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-50 to-blue-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">
            {showLotteryAnim ? '🎰' : '⏳'} Waiting Room
          </h1>
          <p className="text-gray-500 text-sm">
            You are in the fair queue. Random lottery admission ensures
            everyone has equal chance regardless of connection speed.
          </p>
        </div>

        {/* Position Display */}
        <div className="rounded-xl border bg-white p-6 shadow-sm text-center space-y-4">
          <div className="relative">
            <div className="text-6xl font-bold text-blue-600">
              #{status.position}
            </div>
            {showLotteryAnim && status.position > 1 && (
              <div className="absolute -top-2 -right-2 animate-bounce text-lg">
                🎲
              </div>
            )}
          </div>
          <p className="text-gray-500">
            of {status.totalWaiting} people waiting
          </p>

          {/* Animated Progress bar */}
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                progress > 50
                  ? 'bg-gradient-to-r from-blue-400 to-green-400'
                  : 'bg-gradient-to-r from-blue-400 to-blue-600'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          <div className="text-sm text-gray-500 space-y-1">
            <p>⏱ Waiting: {Math.floor(timeElapsed / 60)}m {timeElapsed % 60}s</p>
            <p>Estimated wait: ~{Math.floor(estimatedSeconds / 60)}m {estimatedSeconds % 60}s</p>
            {showLotteryAnim && (
              <p className="text-xs text-blue-500 animate-pulse">
                🎲 Lottery drawing every 100ms — random selection, not FCFS
              </p>
            )}
          </div>
        </div>

        {/* Fairness Info */}
        <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-4 backdrop-blur-sm">
          <h3 className="font-semibold text-blue-800 text-sm mb-2">🎲 How Fair Admission Works</h3>
          <ul className="text-xs text-blue-700 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">✅</span>
              <span>Everyone who arrives in the first 2 seconds has <strong>equal probability</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🎲</span>
              <span>Random lottery — <strong>not first-click-wins</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🤖</span>
              <span>Bots have the <strong>SAME chance</strong> as humans</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🔒</span>
              <span>Your seat will be <strong>LOCKED</strong> when you&apos;re admitted</span>
            </li>
          </ul>
        </div>

        {/* Status + Alert */}
        <div className="space-y-3">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800 text-center">
            ⚠️ Don&apos;t refresh the page. Your position is saved.
            Refreshing resets your wait time.
          </div>
          {status.position <= 50 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700 text-center animate-pulse">
              🎯 You&apos;re near the front! Get ready to book.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function WaitingRoomPage() {
  return (
    <Suspense fallback={<WaitingRoomSkeleton />}>
      <WaitingRoomContent />
    </Suspense>
  );
}
