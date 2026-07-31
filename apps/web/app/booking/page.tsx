'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  UserRound,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  PartyPopper,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Confetti } from '@/components/premium/confetti';
import { CountdownRing } from '@/components/premium/countdown-ring';

interface Passenger {
  name: string;
  age: string;
  berth: string;
  food: string;
}

const emptyPassenger: Passenger = { name: '', age: '', berth: 'no-pref', food: 'none' };

const steps = [
  { key: 'locked', label: 'Locked', icon: Lock },
  { key: 'details', label: 'Details', icon: UserRound },
  { key: 'payment', label: 'Payment', icon: CreditCard },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
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

  const handleProceedToDetails = () => setBookingStep('details');

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
    <div className="min-h-[60vh] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Confetti on confirmation */}
        <Confetti trigger={bookingStep === 'confirmed'} />

        {/* Journey Info Bar */}
        <motion.div
          className="irctc-card mb-6 flex items-center justify-between p-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 text-sm">
            <span className="text-lg">🚄</span>
            <span className="font-bold text-primary">{fromStation || 'New Delhi'}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-bold text-primary">{toStation || 'Mumbai Central'}</span>
          </div>
          <div className="flex items-center gap-3">
            {date && (
              <span className="irctc-badge border border-irctc-200 bg-irctc-50 text-irctc-600 dark:border-irctc-800 dark:bg-irctc-900/40 dark:text-irctc-300">
                {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            )}
            {bookingStep !== 'confirmed' && (
              <span className={`irctc-badge font-mono tabular-nums ${
                urgency === 'critical' ? 'animate-pulse border border-danger/30 bg-danger/10 text-danger' :
                urgency === 'urgent' ? 'border border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300' :
                'border border-irctc-200 bg-irctc-50 text-irctc-600 dark:border-irctc-800 dark:bg-irctc-900/40 dark:text-irctc-300'
              }`}>
                {formatTime(countdown)}
              </span>
            )}
          </div>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          className="irctc-card mb-6 p-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="relative flex items-center justify-between">
            <div className="absolute left-8 right-8 top-4 h-0.5 bg-border" />
            <motion.div
              className="absolute left-8 top-4 h-0.5 bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.5 }}
              style={{ maxWidth: 'calc(100% - 4rem)' }}
            />
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
                    i < currentStepIndex ? 'bg-success text-success-foreground' :
                    i === currentStepIndex ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                    'border border-border bg-secondary text-muted-foreground'
                  }`}>
                    {i < currentStepIndex ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-2xs font-medium ${
                    i <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* Step 1: Locked */}
              {bookingStep === 'locked' && (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="irctc-card space-y-4 p-6 text-center"
                >
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-5xl"
                  >
                    🔒
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-black text-primary">Seat Locked!</h2>
                    <p className="prose-width mx-auto mt-1 text-sm text-muted-foreground">
                      Your seat is exclusively reserved for you. No one else can book it.
                      Complete your booking within {formatTime(countdown)}.
                    </p>
                  </div>

                  {/* Circular countdown */}
                  <div className="flex justify-center py-2">
                    <CountdownRing seconds={countdown} total={300} urgency={urgency} />
                  </div>

                  <button onClick={handleProceedToDetails} className="irctc-btn irctc-btn-primary px-8 py-3 text-base">
                    Fill Passenger Details <ArrowRight className="h-4 w-4" />
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
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground">
                          Passenger {i + 1}
                        </h3>
                        {passengers.length > 1 && (
                          <button
                            onClick={() => removePassenger(i)}
                            className="flex items-center gap-1 text-xs text-destructive transition-colors hover:text-destructive/80"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="irctc-label" htmlFor={`name-${i}`}>Full Name</label>
                          <input
                            id={`name-${i}`}
                            type="text"
                            placeholder="As on ID proof"
                            value={p.name}
                            onChange={(e) => updatePassenger(i, 'name', e.target.value)}
                            className="irctc-input"
                          />
                        </div>
                        <div>
                          <label className="irctc-label" htmlFor={`age-${i}`}>Age</label>
                          <input
                            id={`age-${i}`}
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
                          <label className="irctc-label" htmlFor={`berth-${i}`}>Berth Preference</label>
                          <select
                            id={`berth-${i}`}
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
                          <label className="irctc-label" htmlFor={`food-${i}`}>Food Choice</label>
                          <select
                            id={`food-${i}`}
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
                      <Plus className="h-4 w-4" /> Add Passenger ({passengers.length}/6)
                    </button>
                  )}

                  {error && (
                    <motion.p
                      role="alert"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
                    >
                      {error}
                    </motion.p>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setBookingStep('locked')} className="irctc-btn irctc-btn-outline px-6 py-2.5">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <button onClick={handleProceedToPayment} className="irctc-btn irctc-btn-primary flex-1 py-2.5">
                      Proceed to Payment <ArrowRight className="h-4 w-4" />
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
                  className="irctc-card space-y-5 p-6"
                >
                  <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                    <CreditCard className="h-5 w-5 text-primary" /> Fare Breakdown
                  </h2>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Base Fare ({passengers.length} pax)</span>
                      <span>₹{(baseFare * passengers.length).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tatkal Charges ({passengers.length} pax)</span>
                      <span>₹{(tatkalCharge * passengers.length).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>GST @5%</span>
                      <span>₹{(gst * passengers.length).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 font-bold text-foreground">
                      <span>Total Amount</span>
                      <span className="text-lg text-primary">₹{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {error && (
                    <motion.p
                      role="alert"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
                    >
                      {error}
                    </motion.p>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setBookingStep('details')} className="irctc-btn irctc-btn-outline px-6 py-2.5">
                      <ArrowLeft className="h-4 w-4" /> Back
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
                  className="irctc-card space-y-4 p-12 text-center"
                >
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Processing Payment…</h2>
                  <p className="text-sm text-muted-foreground">
                    Securely confirming your seat with atomic database lock.
                  </p>
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
                  <div className="bg-gradient-to-r from-success to-success-dark p-6 text-center text-white">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="mb-2 text-5xl"
                    >
                      <PartyPopper className="mx-auto h-12 w-12" />
                    </motion.div>
                    <h2 className="text-xl font-black">Booking Confirmed!</h2>
                    <p className="mt-1 text-sm text-white/70">Your ticket has been booked successfully</p>
                  </div>
                  <div className="space-y-4 p-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-2xs uppercase tracking-wider text-muted-foreground">PNR Number</p>
                        <p className="font-mono text-lg font-bold text-primary">{pnr}</p>
                      </div>
                      <div>
                        <p className="text-2xs uppercase tracking-wider text-muted-foreground">Amount Paid</p>
                        <p className="font-mono text-lg font-bold text-success">₹{amountPaid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-2xs uppercase tracking-wider text-muted-foreground">Payment ID</p>
                        <p className="font-mono text-xs text-secondary-foreground">{paymentId}</p>
                      </div>
                      <div>
                        <p className="text-2xs uppercase tracking-wider text-muted-foreground">Reservation ID</p>
                        <p className="font-mono text-xs text-secondary-foreground">{reservationId}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-success/20 bg-success/10 p-3 text-center text-xs text-success">
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
                <p className="mb-2 text-2xs uppercase tracking-wider text-muted-foreground">Time Remaining</p>
                <div className={`font-mono text-4xl font-black tabular-nums ${
                  urgency === 'critical' ? 'animate-pulse text-destructive' :
                  urgency === 'urgent' ? 'text-orange-600 dark:text-orange-400' :
                  'text-primary'
                }`}>
                  {formatTime(countdown)}
                </div>
                <p className="mt-2 text-2xs text-muted-foreground">
                  Seat auto-releases when timer hits 0
                </p>
              </motion.div>
            )}

            {/* Booking Summary */}
            <div className="irctc-card space-y-3 p-5">
              <h3 className="text-sm font-bold text-foreground">Booking Summary</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Route</span>
                  <span className="font-medium text-foreground">{fromStation || 'NDL'} → {toStation || 'BCT'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Passengers</span>
                  <span className="font-medium text-foreground">{passengers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Class</span>
                  <span className="font-medium text-foreground">AC 3 Tier (3A)</span>
                </div>
                <div className="flex justify-between">
                  <span>Quota</span>
                  <span className="font-medium text-foreground">Tatkal</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-bold text-foreground">
                  <span>Total</span>
                  <span className="text-primary">₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="irctc-card space-y-2 p-4">
              {[
                { icon: Lock, text: 'Seat exclusively locked' },
                { icon: Zap, text: 'Atomic DB prevents double booking' },
                { icon: ShieldCheck, text: 'HMAC-signed token verified' },
                { icon: CreditCard, text: 'Idempotent payment — no duplicates' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs text-secondary-foreground">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{text}</span>
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
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center">Loading…</div>}>
      <BookingContent />
    </Suspense>
  );
}
