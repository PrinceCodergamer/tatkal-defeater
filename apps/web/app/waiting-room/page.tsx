'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';

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
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto px-4 space-y-6">
        <div className="irctc-card p-8 space-y-6">
          <div className="h-4 w-48 mx-auto rounded bg-irctc-100 animate-pulse" />
          <div className="h-20 w-32 mx-auto rounded-xl bg-irctc-50 animate-pulse" />
          <div className="h-3 w-full rounded bg-irctc-50 animate-pulse" />
          <div className="h-3 w-2/3 mx-auto rounded bg-irctc-50 animate-pulse" />
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
  const [loading, setLoading] = useState(true);
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

    setLoading(true);

    const socket = io('http://localhost:3001/queue', {
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
    <div className="min-h-[60vh] py-8">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {/* Journey Info Bar */}
        <motion.div
          className="irctc-card p-3 flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 text-sm">
            <span className="text-lg">🚄</span>
            <div>
              <span className="font-bold text-irctc-700">{fromStation}</span>
              <span className="text-text-muted mx-2">→</span>
              <span className="font-bold text-irctc-700">{toStation}</span>
            </div>
          </div>
          {date && (
            <span className="irctc-badge bg-irctc-50 text-irctc-600 border border-irctc-200 text-[10px]">
              {new Date(date).toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short',
              })}
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
          {/* Card Header */}
          <div className="bg-gradient-to-r from-irctc-700 to-irctc-600 px-6 py-4 text-center">
            <h1 className="text-white font-bold text-lg">Fair Waiting Room</h1>
            <p className="text-white/60 text-xs mt-0.5">
              Random lottery admission — equal chance for everyone
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Position Counter */}
            <div className="text-center">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Your Position</p>
              <div className="relative inline-block">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={status.position}
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="text-6xl font-black text-irctc-700 tabular-nums"
                  >
                    #{status.position}
                  </motion.div>
                </AnimatePresence>
                {positionDelta > 0 && (
                  <motion.span
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -30 }}
                    transition={{ duration: 1.5 }}
                    className="absolute -top-2 -right-8 text-sm font-bold text-success"
                  >
                    -{positionDelta}
                  </motion.span>
                )}
              </div>
              <p className="text-sm text-text-muted mt-1">
                of <span className="font-semibold text-text">{status.totalWaiting.toLocaleString()}</span> people waiting
              </p>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-[10px] text-text-muted mb-1.5">
                <span>Queue Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="irctc-progress">
                <motion.div
                  className="irctc-progress-bar"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  style={{
                    background: progress > 70
                      ? 'linear-gradient(90deg, #f37021, #22c55e)'
                      : progress > 40
                        ? 'linear-gradient(90deg, #003366, #f37021)'
                        : 'linear-gradient(90deg, #003366, #0052a3)',
                  }}
                />
              </div>
            </div>

            {/* Time Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-alt rounded-lg p-3 text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Waiting</p>
                <p className="text-lg font-bold text-text tabular-nums">
                  {Math.floor(timeElapsed / 60)}m {(timeElapsed % 60).toString().padStart(2, '0')}s
                </p>
              </div>
              <div className="bg-surface-alt rounded-lg p-3 text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Est. Remaining</p>
                <p className="text-lg font-bold text-text tabular-nums">
                  ~{Math.floor(estimatedSeconds / 60)}m {(estimatedSeconds % 60).toString().padStart(2, '0')}s
                </p>
              </div>
            </div>

            {/* Rotating Status Message */}
            <div className="bg-irctc-50 border border-irctc-200 rounded-lg p-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={messageIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 text-xs text-irctc-700"
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
          <h3 className="font-bold text-sm text-irctc-700 mb-3 flex items-center gap-2">
            <span>🎲</span> How Fair Admission Works
          </h3>
          <ul className="space-y-2.5">
            {[
              { icon: '✅', text: 'Everyone in the first 2 seconds has equal probability' },
              { icon: '🎲', text: 'Random lottery — not first-click-wins' },
              { icon: '🤖', text: 'Bots have the same chance as humans' },
              { icon: '🔒', text: 'Your seat will be LOCKED when you\'re admitted' },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-2.5 text-xs text-text-secondary">
                <span className="mt-0.5 shrink-0">{item.icon}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Alerts */}
        <div className="space-y-3">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700 text-center flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>Don&apos;t refresh the page. Your position is saved.</span>
          </div>

          <AnimatePresence>
            {isNearFront && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-success-bg border border-success/20 rounded-lg p-4 text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-2xl mb-1"
                >
                  🎯
                </motion.div>
                <p className="text-sm font-bold text-success">You&apos;re near the front!</p>
                <p className="text-xs text-success/70 mt-0.5">Get ready — your seat is about to be locked</p>
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
