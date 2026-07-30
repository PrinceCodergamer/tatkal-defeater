'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function BookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenId = searchParams.get('tokenId') || '';

  const [countdown, setCountdown] = useState(300); // 5 min in seconds
  const [bookingStep, setBookingStep] = useState<'locked' | 'filling' | 'paying' | 'done'>('locked');
  const [reservationId, setReservationId] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [error, setError] = useState('');

  // Countdown timer
  useEffect(() => {
    if (bookingStep === 'done') return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [bookingStep]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  async function handleBook() {
    setError('');
    try {
      const fp = `fp_${Math.random().toString(36).slice(2)}`;
      const idempotencyKey = `book_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      // Allocate seat
      const allocateRes = await fetch('/api/reservation/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: 'auto',
          userId: 'user-demo',
          quantity: 1,
          idempotencyKey,
          deviceFingerprint: fp,
        }),
      });
      const allocateData = await allocateRes.json();

      if (!allocateData.reservationId) {
        throw new Error(allocateData.message || 'No seats available');
      }

      setReservationId(allocateData.reservationId);
      setBookingStep('filling');

      // Simulate form fill delay
      await new Promise((r) => setTimeout(r, 2000));
      setBookingStep('paying');

      // Create payment
      const paymentRes = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: allocateData.reservationId,
          userId: 'user-demo',
          amount: 1500,
          idempotencyKey: `pay_${Date.now()}`,
        }),
      });
      const paymentData = await paymentRes.json();
      setPaymentId(paymentData.paymentId);

      // Process payment
      const processRes = await fetch('/api/payment/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentData.paymentId,
        }),
      });
      const processData = await processRes.json();

      if (processData.success) {
        setBookingStep('done');
      } else {
        throw new Error('Payment failed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Booking failed';
      setError(message);
    }
  }

  if (bookingStep === 'done') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-green-50">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h1 className="text-2xl font-bold text-green-800">Booking Confirmed!</h1>
          <div className="rounded-xl border border-green-200 bg-white p-6 space-y-2 text-sm">
            <p><strong>Reservation ID:</strong> {reservationId}</p>
            <p><strong>Payment ID:</strong> {paymentId}</p>
            <p><strong>Status:</strong> <span className="text-green-600 font-semibold">CONFIRMED</span></p>
          </div>
          <p className="text-sm text-gray-500">
            Your seat is locked and confirmed. No double booking possible.
          </p>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 transition"
          >
            Book Another
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">🎫 Complete Your Booking</h1>

          {/* Countdown Timer */}
          <div className={`text-4xl font-mono font-bold ${countdown < 60 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
            ⏱ {formatTime(countdown)}
          </div>
          <p className="text-sm text-gray-500">
            Your seat is LOCKED. Complete booking before time runs out.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            ❌ {error}
            <p className="mt-1 text-xs">
              Your seat was released. Please try again.
            </p>
          </div>
        )}

        {/* Status Steps */}
        <div className="rounded-xl border bg-white p-6 space-y-4">
          <h2 className="font-semibold">Booking Progress</h2>
          <div className="space-y-3">
            <div className={`flex items-center gap-3 text-sm ${bookingStep !== 'locked' ? 'text-green-600' : 'text-blue-600 font-medium'}`}>
              <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs">
                {bookingStep !== 'locked' ? '✓' : '1'}
              </span>
              Seat Locked — Ready for your details
            </div>
            <div className={`flex items-center gap-3 text-sm ${bookingStep === 'paying' ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs">
                {bookingStep === 'paying' ? '✓' : '2'}
              </span>
              Filling passenger details
            </div>
            <div className={`flex items-center gap-3 text-sm text-gray-400`}>
              <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs">3</span>
              Payment confirmed
            </div>
          </div>
        </div>

        {/* Booking Button */}
        <button
          onClick={handleBook}
          disabled={bookingStep !== 'locked'}
          className={`w-full rounded-lg px-4 py-3 text-white font-semibold text-lg transition shadow-md
            ${bookingStep === 'locked'
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
            }`}
        >
          {bookingStep === 'locked' ? '🎯 Confirm Booking Now' :
           bookingStep === 'filling' ? '⏳ Filling details...' :
           bookingStep === 'paying' ? '💳 Processing payment...' :
           '✅ Done'}
        </button>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
          🔒 Your seat is held exclusively for you for {formatTime(countdown)}.
          No one else can book it. If you don&apos;t complete payment, it will be
          released to the next person in the queue.
        </div>
      </div>
    </main>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <BookingContent />
    </Suspense>
  );
}
