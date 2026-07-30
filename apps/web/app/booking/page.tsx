'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Passenger {
  name: string;
  age: string;
  berth: string;
  food: string;
}

const emptyPassenger: Passenger = { name: '', age: '', berth: 'no-pref', food: 'none' };

const steps = [
  { key: 'locked', label: 'Locked', icon: '🔒' },
  { key: 'details', label: 'Details', icon: '📝' },
  { key: 'payment', label: 'Payment', icon: '💳' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
];

function BookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenId = searchParams.get('tokenId') || '';
  const fromStation = searchParams.get('from') || '';
  const toStation = searchParams.get('to') || '';
  const date = searchParams.get('date') || '';

  const [countdown, setCountdown] = useState(300);
  const [bookingStep, setBookingStep] = useState<'locked' | 'details' | 'payment' | 'processing' | 'confirmed'>('locked');
  const [passengers, setPassengers] = useState<Passenger[]>([{ ...emptyPassenger }]);
  const [reservationId, setReservationId] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [pnr, setPnr] = useState('');
  const [amountPaid, setAmountPaid] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (bookingStep === 'confirmed') return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [bookingStep]);

  useEffect(() => {
    if (!tokenId) return;
    (async () => {
      try {
        const res = await fetch(`/api/admission/token/${tokenId}`);
        const data = await res.json();
        if (data.holdExpiresAt) {
          const remaining = Math.max(0, Math.floor((new Date(data.holdExpiresAt).getTime() - Date.now()) / 1000));
          setCountdown(remaining);
        }
      } catch {
        // Use default countdown
      }
    })();
  }, [tokenId]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const updatePassenger = useCallback((index: number, field: keyof Passenger, value: string) => {
    setPassengers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addPassenger = () => {
    if (passengers.length < 6) setPassengers((p) => [...p, { ...emptyPassenger }]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length > 1) setPassengers((p) => p.filter((_, i) => i !== index));
  };

  const baseFare = 755;
  const tatkalCharge = 500;
  const gst = Math.round((baseFare + tatkalCharge) * 0.05);
  const totalPerPassenger = baseFare + tatkalCharge + gst;
  const grandTotal = totalPerPassenger * passengers.length;

  const handleProceedToDetails = () => {
    setBookingStep('details');
  };

  const handleProceedToPayment = () => {
    const invalid = passengers.some((p) => !p.name.trim() || !p.age || parseInt(p.age) < 1);
    if (invalid) {
      setError('Please fill all passenger details (name and age required)');
      return;
    }
    setError('');
    setBookingStep('payment');
  };

  const handlePay = async () => {
    setLoading(true);
    setError('');
    setBookingStep('processing');

    try {
      const fp = `fp_${Math.random().toString(36).slice(2)}`;
      const idempotencyKey = `book_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const allocateRes = await fetch('/api/reservation/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: 'auto',
          userId: 'user-demo',
          quantity: passengers.length,
          idempotencyKey,
          deviceFingerprint: fp,
          passengers,
        }),
      });
      const allocateData = await allocateRes.json();
      if (!allocateData.reservationId) throw new Error(allocateData.message || 'No seats available');
      setReservationId(allocateData.reservationId);

      const paymentRes = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: allocateData.reservationId,
          userId: 'user-demo',
          amount: grandTotal,
          idempotencyKey: `pay_${Date.now()}`,
        }),
      });
      const paymentData = await paymentRes.json();
      setPaymentId(paymentData.paymentId);

      const processRes = await fetch('/api/payment/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: paymentData.paymentId }),
      });
      const processData = await processRes.json();

      if (processData.success) {
        setPnr(`PNR${Date.now().toString(36).toUpperCase()}`);
        setAmountPaid(grandTotal);
        setBookingStep('confirmed');
      } else {
        throw new Error('Payment failed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Booking failed';
      setError(message);
      setBookingStep('payment');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = steps.findIndex((s) => s.key === (bookingStep === 'processing' ? 'payment' : bookingStep));
  const urgency = countdown < 30 ? 'critical' : countdown < 60 ? 'urgent' : 'normal';

  return (
    <div className="min-h-[60vh] py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Journey Info Bar */}
        <motion.div
          className="irctc-card p-3 flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 text-sm">
            <span className="text-lg">🚄</span>
            <span className="font-bold text-irctc-700">{fromStation || 'New Delhi'}</span>
            <span className="text-text-muted">→</span>
            <span className="font-bold text-irctc-700">{toStation || 'Mumbai Central'}</span>
          </div>
          <div className="flex items-center gap-3">
            {date && (
              <span className="irctc-badge bg-irctc-50 text-irctc-600 border border-irctc-200 text-[10px]">
                {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            )}
            {bookingStep !== 'confirmed' && (
              <span className={`irctc-badge text-[10px] font-mono tabular-nums ${
                urgency === 'critical' ? 'bg-danger/10 text-danger border border-danger/30 animate-pulse' :
                urgency === 'urgent' ? 'bg-orange-50 text-orange-600 border border-orange-300' :
                'bg-irctc-50 text-irctc-600 border border-irctc-200'
              }`}>
                {formatTime(countdown)}
              </span>
            )}
          </div>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          className="irctc-card p-4 mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-8 right-8 h-0.5 bg-border" />
            <motion.div
              className="absolute top-4 left-8 h-0.5 bg-irctc-500"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.5 }}
              style={{ maxWidth: 'calc(100% - 4rem)' }}
            />
            {steps.map((step, i) => (
              <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${
                  i < currentStepIndex ? 'bg-success text-white' :
                  i === currentStepIndex ? 'bg-irctc-600 text-white ring-4 ring-irctc-100' :
                  'bg-surface-alt text-text-muted border border-border'
                }`}>
                  {i < currentStepIndex ? '✓' : step.icon}
                </div>
                <span className={`text-[10px] font-medium ${
                  i <= currentStepIndex ? 'text-irctc-700' : 'text-text-muted'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Locked */}
              {bookingStep === 'locked' && (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="irctc-card p-6 text-center space-y-4"
                >
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-5xl"
                  >
                    🔒
                  </motion.div>
                  <h2 className="text-xl font-black text-irctc-700">Seat Locked!</h2>
                  <p className="text-sm text-text-muted max-w-md mx-auto">
                    Your seat is exclusively reserved for you. No one else can book it.
                    Complete your booking within {formatTime(countdown)}.
                  </p>
                  <button onClick={handleProceedToDetails} className="irctc-btn irctc-btn-primary px-8 py-3 text-base">
                    Fill Passenger Details
                  </button>
                </motion.div>
              )}

              {/* Step 2: Passenger Details */}
              {bookingStep === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {passengers.map((p, i) => (
                    <div key={i} className="irctc-card p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-irctc-700">
                          Passenger {i + 1}
                        </h3>
                        {passengers.length > 1 && (
                          <button
                            onClick={() => removePassenger(i)}
                            className="text-xs text-danger hover:text-danger/80 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="irctc-label">Full Name</label>
                          <input
                            type="text"
                            placeholder="As on ID proof"
                            value={p.name}
                            onChange={(e) => updatePassenger(i, 'name', e.target.value)}
                            className="irctc-input"
                          />
                        </div>
                        <div>
                          <label className="irctc-label">Age</label>
                          <input
                            type="number"
                            placeholder="Age"
                            value={p.age}
                            onChange={(e) => updatePassenger(i, 'age', e.target.value)}
                            className="irctc-input"
                            min="1"
                            max="120"
                          />
                        </div>
                        <div>
                          <label className="irctc-label">Berth Preference</label>
                          <select
                            value={p.berth}
                            onChange={(e) => updatePassenger(i, 'berth', e.target.value)}
                            className="irctc-select"
                          >
                            <option value="no-pref">No Preference</option>
                            <option value="lower">Lower</option>
                            <option value="middle">Middle</option>
                            <option value="upper">Upper</option>
                            <option value="side-lower">Side Lower</option>
                            <option value="side-upper">Side Upper</option>
                          </select>
                        </div>
                        <div>
                          <label className="irctc-label">Food Choice</label>
                          <select
                            value={p.food}
                            onChange={(e) => updatePassenger(i, 'food', e.target.value)}
                            className="irctc-select"
                          >
                            <option value="none">No Food</option>
                            <option value="veg">Veg Meal</option>
                            <option value="non-veg">Non-Veg Meal</option>
                            <option value="jain">Jain Meal</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  {passengers.length < 6 && (
                    <button onClick={addPassenger} className="irctc-btn irctc-btn-outline w-full py-2.5 text-sm">
                      + Add Passenger ({passengers.length}/6)
                    </button>
                  )}

                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-danger bg-danger-bg px-3 py-2 rounded-md"
                    >
                      {error}
                    </motion.p>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setBookingStep('locked')} className="irctc-btn irctc-btn-outline px-6 py-2.5">
                      Back
                    </button>
                    <button onClick={handleProceedToPayment} className="irctc-btn irctc-btn-primary flex-1 py-2.5">
                      Proceed to Payment
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Payment */}
              {bookingStep === 'payment' && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="irctc-card p-6 space-y-5"
                >
                  <h2 className="text-lg font-bold text-irctc-700 flex items-center gap-2">
                    <span>💳</span> Fare Breakdown
                  </h2>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-text-secondary">
                      <span>Base Fare ({passengers.length} pax)</span>
                      <span>₹{(baseFare * passengers.length).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Tatkal Charges ({passengers.length} pax)</span>
                      <span>₹{(tatkalCharge * passengers.length).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>GST @5%</span>
                      <span>₹{(gst * passengers.length).toLocaleString()}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-bold text-text">
                      <span>Total Amount</span>
                      <span className="text-irctc-700 text-lg">₹{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-danger bg-danger-bg px-3 py-2 rounded-md"
                    >
                      {error}
                    </motion.p>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setBookingStep('details')} className="irctc-btn irctc-btn-outline px-6 py-2.5">
                      Back
                    </button>
                    <button onClick={handlePay} disabled={loading} className="irctc-btn irctc-btn-orange flex-1 py-3 text-base">
                      Pay ₹{grandTotal.toLocaleString()}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Processing */}
              {bookingStep === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="irctc-card p-12 text-center space-y-4"
                >
                  <motion.div
                    animate={{ rotateY: [0, 360] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    className="text-5xl inline-block"
                  >
                    💳
                  </motion.div>
                  <h2 className="text-lg font-bold text-irctc-700">Processing Payment</h2>
                  <p className="text-xs text-text-muted">
                    Please wait while we securely process your payment...
                  </p>
                  <div className="flex justify-center">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-irctc-500"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Confirmed */}
              {bookingStep === 'confirmed' && (
                <motion.div
                  key="confirmed"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="irctc-card overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-success to-emerald-500 p-6 text-center text-white">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="text-5xl mb-2"
                    >
                      🎉
                    </motion.div>
                    <h2 className="text-xl font-black">Booking Confirmed!</h2>
                    <p className="text-sm text-white/70 mt-1">Your ticket has been booked successfully</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider">PNR Number</p>
                        <p className="font-bold text-irctc-700 text-lg">{pnr}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider">Amount Paid</p>
                        <p className="font-bold text-success text-lg">₹{amountPaid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider">Payment ID</p>
                        <p className="font-mono text-xs text-text-secondary">{paymentId}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider">Reservation ID</p>
                        <p className="font-mono text-xs text-text-secondary">{reservationId}</p>
                      </div>
                    </div>

                    <div className="bg-success-bg border border-success/20 rounded-lg p-3 text-xs text-success text-center">
                      Atomic database lock guarantees no double booking. Your seat is confirmed.
                    </div>

                    <button
                      onClick={() => router.push('/')}
                      className="irctc-btn irctc-btn-primary w-full py-2.5"
                    >
                      Book Another Ticket
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Countdown */}
            {bookingStep !== 'confirmed' && (
              <motion.div
                className="irctc-card p-5 text-center"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Time Remaining</p>
                <div className={`text-4xl font-black font-mono tabular-nums ${
                  urgency === 'critical' ? 'text-danger animate-pulse' :
                  urgency === 'urgent' ? 'text-orange-500' :
                  'text-irctc-700'
                }`}>
                  {formatTime(countdown)}
                </div>
                <p className="text-[10px] text-text-muted mt-2">
                  Seat auto-releases when timer hits 0
                </p>
              </motion.div>
            )}

            {/* Booking Summary */}
            <div className="irctc-card p-5 space-y-3">
              <h3 className="text-sm font-bold text-irctc-700">Booking Summary</h3>
              <div className="space-y-2 text-xs text-text-secondary">
                <div className="flex justify-between">
                  <span>Route</span>
                  <span className="font-medium text-text">{fromStation || 'NDL'} → {toStation || 'BCT'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Passengers</span>
                  <span className="font-medium text-text">{passengers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Class</span>
                  <span className="font-medium text-text">AC 3 Tier (3A)</span>
                </div>
                <div className="flex justify-between">
                  <span>Quota</span>
                  <span className="font-medium text-text">Tatkal</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold text-text">
                  <span>Total</span>
                  <span className="text-irctc-700">₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="irctc-card p-4 space-y-2">
              {[
                { icon: '🔒', text: 'Seat exclusively locked' },
                { icon: '⚡', text: 'Atomic DB prevents double booking' },
                { icon: '🛡️', text: 'HMAC-signed token verified' },
                { icon: '💳', text: 'Idempotent payment — no duplicates' },
              ].map((badge) => (
                <div key={badge.text} className="flex items-center gap-2 text-[11px] text-text-secondary">
                  <span>{badge.icon}</span>
                  <span>{badge.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="irctc-card p-8 text-center space-y-3">
          <div className="text-3xl animate-pulse">🔒</div>
          <p className="text-sm text-text-muted">Loading your booking...</p>
        </div>
      </div>
    }>
      <BookingContent />
    </Suspense>
  );
}
