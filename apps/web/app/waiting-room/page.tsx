'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { ShieldCheck, Timer, Zap, TrainFront, Gift } from 'lucide-react';
import { QueueVisualizer } from '@/components/premium/queue-visualizer';
import { Skeleton } from '@/components/ui/skeleton';
import { formatJourneyDate } from '@/lib/dates';

interface QueueStatus {
  position: number;
  totalWaiting: number;
  status: string;
}

const statusMessages = [
  { icon: '🎲', text: 'Random lottery in progress — everyone has equal chance' },
  { icon: '🔒', text: 'Your seat will be locked for 5 minutes when admitted' },
  { icon: '🛡️', text: 'Bot detection active — fair for all passengers' },
  { icon: '⚡', text: 'Atomic allocation prevents double booking' },
  { icon: '🚄', text: 'Processing queue at 500 admissions per second' },
  { icon: '🎯', text: 'No speed advantage — bots have same odds as humans' },
];

function WaitingRoomSkeleton() {
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

function WaitingRoomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenId = searchParams.get('tokenId') || '';
  const fromStation = searchParams.get('from') || '';
  const toStation = searchParams.get('to') || '';
  const date = searchParams.get('date') || '';
  const socketRef = useRef<Socket | null>(null);

  const [status, setStatus] = useState<QueueStatus>({
    position: parseInt(searchParams.get('position') || '0'),
    totalWaiting: parseInt(searchParams.get('total') || '0'),
    status: 'WAITING',
  });
  const [timeElapsed, setTimeElapsed] = useState(0);
  // Optimistic: position/total are already in the query params, so render
  // content immediately instead of blocking on the first poll/socket round-trip.
  const [loading, setLoading] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [prevPosition, setPrevPosition] = useState(status.position);

  const handleAdmitted = useCallback(() => {
    router.push(
      `/booking?tokenId=${tokenId}&from=${encodeURIComponent(fromStation)}&to=${encodeURIComponent(toStation)}&date=${date}`
    );
  }, [router, tokenId, fromStation, toStation, date]);

  useEffect(() => {
    if (!tokenId) {
      router.push('/');
      return;
    }

    // Connect via same-origin so it works through the tunnel/proxy too.
    const socket = io('/queue', {
      query: { tokenId },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.emit('subscribe:position');

    socket.on('queue:update', (data: QueueStatus) => {
      setPrevPosition(status.position);
      setStatus(data);
      setLoading(false);
    });

    socket.on('queue:admitted', handleAdmitted);

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admission/status/${tokenId}`);
        const data = await res.json();
        setPrevPosition((prev) => prev);
        setStatus(data);
        setLoading(false);
        if (data.status === 'ADMITTED') {
          clearInterval(pollInterval);
          handleAdmitted();
        }
      } catch {
        // Server unreachable — keep polling
      }
    }, 1000);

    const timer = setInterval(() => {
      setTimeElapsed((t) => t + 1);
    }, 1000);

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
      clearInterval(timer);
    };
  }, [tokenId, router, handleAdmitted, status.position]);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % statusMessages.length);
    }, 4000);
    return () => clearInterval(msgTimer);
  }, []);

  if (loading) return <WaitingRoomSkeleton />;

  const progress = status.totalWaiting > 0
    ? ((status.totalWaiting - status.position) / status.totalWaiting) * 100
    : 0;

  const estimatedSeconds = Math.ceil(status.position / 500) * 60;
  const isNearFront = status.position <= 50;
  const positionDelta = prevPosition - status.position;

  return (
    <div className="min-h-[60vh] px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Journey Info Bar */}
        <motion.div
          className="irctc-card flex items-center justify-between p-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 text-sm">
            <span className="text-lg"><TrainFront className="h-5 w-5 text-primary" /></span>
            <div>
              <span className="font-bold text-primary">{fromStation}</span>
              <span className="mx-2 text-muted-foreground">→</span>
              <span className="font-bold text-primary">{toStation}</span>
            </div>
          </div>
          {date && (
            <span className="irctc-badge bg-irctc-50 text-irctc-600 border border-irctc-200 dark:bg-irctc-900/40 dark:text-irctc-300">
              {formatJourneyDate(date)}
            </span>
          )}
        </motion.div>

        {/* Main Waiting Card */}
        <motion.div
          className="irctc-card overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-gradient-to-r from-irctc-700 to-irctc-600 px-6 py-4 text-center dark:from-irctc-900 dark:to-irctc-800">
            <h1 className="text-lg font-bold text-white">Fair Waiting Room</h1>
            <p className="mt-0.5 text-xs text-white/60">
              Random lottery admission — equal chance for everyone
            </p>
          </div>

          <div className="space-y-6 p-6">
            {/* Position Counter + Animated Ring */}
            <div className="flex flex-col items-center">
              <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                Your Position
              </p>

              <div aria-live="polite" aria-atomic="true" className="sr-only">
                Position {status.position} of {status.totalWaiting} people waiting
              </div>

              <QueueVisualizer position={status.position} total={status.totalWaiting} />

              <div className="mt-3 flex h-6 items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={positionDelta}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm font-bold text-success"
                  >
                    {positionDelta > 0 ? `−${positionDelta} ahead` : ' '}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="mb-1.5 flex justify-between text-2xs text-muted-foreground">
                <span>Queue Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="irctc-progress">
                <motion.div
                  className={`irctc-progress-bar bg-gradient-to-r ${
                    progress > 70
                      ? 'from-orange-500 to-success'
                      : progress > 40
                        ? 'from-irctc-700 to-orange-500'
                        : 'from-irctc-700 to-irctc-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Time Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-secondary p-3 text-center">
                <p className="text-2xs uppercase tracking-wider text-muted-foreground">Waiting</p>
                <p className="font-mono text-lg font-bold tabular-nums text-foreground">
                  {Math.floor(timeElapsed / 60)}m {(timeElapsed % 60).toString().padStart(2, '0')}s
                </p>
              </div>
              <div className="rounded-lg bg-secondary p-3 text-center">
                <p className="text-2xs uppercase tracking-wider text-muted-foreground">Est. Remaining</p>
                <p className="font-mono text-lg font-bold tabular-nums text-foreground">
                  ~{Math.floor(estimatedSeconds / 60)}m {(estimatedSeconds % 60).toString().padStart(2, '0')}s
                </p>
              </div>
            </div>

            {/* Rotating Status Message */}
            <div className="rounded-lg border border-irctc-200 bg-irctc-50 p-3 dark:border-irctc-800 dark:bg-irctc-900/40">
              <AnimatePresence mode="wait">
                <motion.div
                  key={messageIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 text-xs text-irctc-700 dark:text-irctc-300"
                >
                  <span className="text-base">{statusMessages[messageIndex].icon}</span>
                  <span>{statusMessages[messageIndex].text}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Fairness Info */}
        <motion.div
          className="irctc-card p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
            <Gift className="h-4 w-4 text-orange-500" /> How Fair Admission Works
          </h3>
          <ul className="space-y-2.5">
            {[
              { icon: ShieldCheck, text: 'Everyone in the first 2 seconds has equal probability' },
              { icon: Gift, text: 'Random lottery — not first-click-wins' },
              { icon: Zap, text: 'Bots have the same chance as humans' },
              { icon: Timer, text: 'Your seat will be LOCKED when you\'re admitted' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-xs text-secondary-foreground">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Alerts */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-center text-xs text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300">
            <span>⚠️</span>
            <span>Don&apos;t refresh the page. Your position is saved.</span>
          </div>

          <AnimatePresence>
            {isNearFront && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-lg border border-success/20 bg-success/10 p-4 text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="mb-1 text-2xl"
                >
                  🎯
                </motion.div>
                <p className="text-sm font-bold text-success">You&apos;re near the front!</p>
                <p className="mt-0.5 text-xs text-success/70">Get ready — your seat is about to be locked</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function WaitingRoomPage() {
  return (
    <Suspense fallback={<WaitingRoomSkeleton />}>
      <WaitingRoomContent />
    </Suspense>
  );
}
