'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowRight,
  Calendar,
  MapPin,
  ShieldCheck,
  Sparkles,
  Timer,
  TrainFront,
  Zap,
  Repeat,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { HeroSection } from '@/components/hero/hero-section';
import { CountUp } from '@/components/premium/count-up';
import { useScrollReveal } from '@/lib/use-gsap';

const popularRoutes = [
  { from: 'New Delhi', to: 'Mumbai Central', code: 'NDLS-BCT', trains: 'Rajdhani, Shatabdi' },
  { from: 'Howrah', to: 'New Delhi', code: 'HWH-NDLS', trains: 'Howrah Rajdhani, Poorva Exp' },
  { from: 'Chennai Central', to: 'Bangalore', code: 'MAS-SBC', trains: 'Chennai Exp, Shatabdi' },
  { from: 'Mumbai Central', to: 'Ahmedabad', code: 'BCT-ADI', trains: 'Shatabdi, Gujarat Exp' },
];

const features = [
  { icon: Sparkles, title: 'Random Lottery', desc: 'Not first-come-first-served. Everyone has equal chance.' },
  { icon: Timer, title: '5-Min Seat Lock', desc: 'Seat held while you fill details. No rush.' },
  { icon: ShieldCheck, title: 'Bot Protected', desc: 'Device fingerprinting keeps scalpers out.' },
  { icon: Zap, title: 'Atomic Booking', desc: 'Database locks prevent double booking.' },
];

const stations = [
  'New Delhi', 'Mumbai Central', 'Howrah', 'Chennai Central',
  'Bangalore', 'Ahmedabad', 'Pune', 'Jaipur', 'Lucknow',
  'Chandigarh', 'Bhopal', 'Patna', 'Guwahati', 'Kolkata',
];

export default function HomePage() {
  const router = useRouter();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [travelClass, setTravelClass] = useState('all');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'search' | 'verify' | 'ready'>('search');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const filteredFrom = from ? stations.filter(s => s.toLowerCase().includes(from.toLowerCase()) && s !== to) : [];
  const filteredTo = to ? stations.filter(s => s.toLowerCase().includes(to.toLowerCase()) && s !== from) : [];

  function swapStations() { setFrom(to); setTo(from); }
  function selectRoute(route: typeof popularRoutes[0]) { setFrom(route.from); setTo(route.to); }

  async function handleSearch() {
    if (!from || !to) { setError('Please select source and destination stations'); return; }
    if (from.toLowerCase() === to.toLowerCase()) { setError('Source and destination cannot be same'); return; }
    setError('');
    if (step === 'search') { setStep('verify'); return; }
    await handleEnterQueue();
  }

  async function handleVerify() {
    if (phone.length !== 10) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.verified) {
        setStep('ready');
        toast.success('Identity verified', { description: `+91 ${phone} confirmed` });
      } else {
        setError(data.message || 'Verification failed');
        toast.error(data.message || 'Verification failed');
      }
    } catch {
      setError('Server unreachable. Is the API running?');
      toast.error('Server unreachable');
    } finally { setLoading(false); }
  }

  async function handleEnterQueue() {
    setLoading(true); setError('');
    const fp = `fp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    try {
      const res = await fetch('/api/admission/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: phone, deviceFingerprint: fp }),
      });
      const data = await res.json();
      if (data.tokenId) {
        toast.success('Entered fair queue', {
          description: `Position #${data.position} of ${data.totalWaiting} waiting`,
        });
        router.push(`/waiting-room?tokenId=${data.tokenId}&position=${data.position}&total=${data.totalWaiting}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`);
      } else {
        setError(data.error || 'Failed to enter queue');
        toast.error(data.error || 'Failed to enter queue');
      }
    } catch {
      setError('Server unreachable. Please try again.');
      toast.error('Server unreachable');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <HeroSection />

      {/* ── Search Card ── */}
      <section id="search" className="mx-auto max-w-[1200px] px-4 -mt-10 pb-10">
        <div className="irctc-search-card">
          <div className="irctc-search-header">
            <span className="text-lg text-white"><Search className="h-5 w-5" /></span>
            <div>
              <h2 className="text-sm font-bold text-white">Search Trains</h2>
              <p className="text-xs text-white/60">Enter your journey details</p>
            </div>
          </div>

          <div className="irctc-search-body">
            <div className="irctc-search-row">
              <div>
                <label className="irctc-label" htmlFor="from">From</label>
                <div className="relative">
                  <input
                    id="from"
                    type="text"
                    placeholder="Enter source station"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="irctc-input pr-10"
                    autoComplete="off"
                    aria-label="Source station"
                  />
                  <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  {filteredFrom.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border bg-card shadow-dropdown">
                      {filteredFrom.map((s) => (
                        <button
                          key={s}
                          className="w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                          onClick={() => setFrom(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center pb-1">
                <button
                  onClick={swapStations}
                  className="irctc-swap shrink-0"
                  title="Swap stations"
                  type="button"
                  aria-label="Swap source and destination"
                >
                  <Repeat className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="irctc-label" htmlFor="to">To</label>
                <div className="relative">
                  <input
                    id="to"
                    type="text"
                    placeholder="Enter destination station"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="irctc-input pr-10"
                    autoComplete="off"
                    aria-label="Destination station"
                  />
                  <TrainFront className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  {filteredTo.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border bg-card shadow-dropdown">
                      {filteredTo.map((s) => (
                        <button
                          key={s}
                          className="w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                          onClick={() => setTo(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="irctc-label" htmlFor="date">Date of Journey</label>
                <div className="relative">
                  <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="irctc-input pr-10"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label className="irctc-label" htmlFor="class">Class</label>
                <select id="class" value={travelClass} onChange={(e) => setTravelClass(e.target.value)} className="irctc-select">
                  <option value="all">All Classes</option>
                  <option value="1a">AC First Class (1A)</option>
                  <option value="2a">AC 2 Tier (2A)</option>
                  <option value="3a">AC 3 Tier (3A)</option>
                  <option value="sl">Sleeper (SL)</option>
                  <option value="cc">Chair Car (CC)</option>
                  <option value="gen">General (GN)</option>
                </select>
              </div>
              <div>
                <label className="irctc-label" htmlFor="quota">Tatkal Quota</label>
                <select id="quota" className="irctc-select">
                  <option value="general">General</option>
                  <option value="tatkal">Tatkal</option>
                  <option value="premium-tatkal">Premium Tatkal</option>
                  <option value="ladies">Ladies</option>
                </select>
              </div>
            </div>

            {error && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </motion.p>
            )}

            <AnimatePresence mode="wait">
              {step === 'search' && (
                <motion.div key="search" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <button onClick={handleSearch} className="irctc-btn irctc-btn-primary mt-4 w-full py-3 text-base">
                    <Search className="h-4 w-4" /> Search Trains
                  </button>
                </motion.div>
              )}

              {step === 'verify' && (
                <motion.div key="verify" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border border-irctc-200 bg-irctc-50 p-3 text-xs text-irctc-700 dark:border-irctc-800 dark:bg-irctc-900/40 dark:text-irctc-300">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>One-time verification before entering the queue. No OTP during booking.</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="irctc-label" htmlFor="phone">Mobile Number</label>
                      <input
                        id="phone"
                        type="tel"
                        placeholder="Enter 10-digit mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="irctc-input"
                        maxLength={10}
                        autoFocus
                      />
                    </div>
                    <div className="flex items-end">
                      <button onClick={handleVerify} disabled={phone.length !== 10 || loading} className="irctc-btn irctc-btn-orange h-[42px]">
                        {loading ? '⏳' : 'Verify →'}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setStep('search')} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                    ← Back to search
                  </button>
                </motion.div>
              )}

              {step === 'ready' && (
                <motion.div key="ready" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/10 p-3">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <div>
                      <p className="text-sm font-semibold text-success">Identity Verified</p>
                      <p className="text-xs text-muted-foreground">+91 {phone}</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-irctc-50 p-3 text-xs text-irctc-700 dark:bg-irctc-900/40 dark:text-irctc-300">
                    <strong>{from}</strong> → <strong>{to}</strong> on {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <button onClick={handleSearch} disabled={loading} className="irctc-btn irctc-btn-orange w-full py-3 text-base">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Entering Fair Queue...
                      </span>
                    ) : (
                      <>🎯 Enter Fair Waiting Room <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                  <p className="text-center text-2xs text-muted-foreground">
                    Random lottery admission — everyone in the first 2 seconds has equal probability
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="irctc-search-footer">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
              Fair lottery system — bots have <strong>same</strong> chance as humans
            </span>
          </div>
        </div>
      </section>

      {/* ── Popular Routes ── */}
      <PopularRoutes selectRoute={selectRoute} />

      {/* ── How It Works ── */}
      <section id="how-it-works" className="mx-auto max-w-[1200px] px-4 py-12">
        <div className="text-center">
          <h2 className="text-xl font-black text-foreground md:text-2xl">How Fair Booking Works</h2>
          <p className="mt-1 text-xs text-muted-foreground">No bots. No scalpers. Just fair random lottery admission.</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            { step: '1', title: 'Search Train', desc: 'Enter your journey and verify identity.' },
            { step: '2', title: 'Enter Queue', desc: 'Join the fair waiting room. Equal odds.' },
            { step: '3', title: 'Lottery Draw', desc: 'Random selection — no speed advantage.' },
            { step: '4', title: 'Seat Locked', desc: '5-minute hold. Fill details without rush.' },
            { step: '5', title: 'Confirmed!', desc: 'Atomic locks prevent double booking.' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              className="irctc-card p-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-irctc-100 text-sm font-black text-irctc-700 dark:bg-irctc-900 dark:text-irctc-300">
                {item.step}
              </div>
              <h4 className="mb-1 text-sm font-bold text-foreground">{item.title}</h4>
              <p className="text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-y bg-card py-12">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="irctc-card p-5"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <span className="mb-2 block text-2xl"><f.icon className="h-6 w-6 text-primary" /></span>
                <h4 className="mb-1 text-sm font-bold text-foreground">{f.title}</h4>
                <p className="text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Banner (animated counters) ── */}
      <StatsBanner />
    </div>
  );
}

/** Popular routes grid with GSAP reveal */
function PopularRoutes({ selectRoute }: { selectRoute: (r: typeof popularRoutes[0]) => void }) {
  const ref = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="mx-auto max-w-[1200px] px-4 pb-8">
      <div className="irctc-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <h3 className="text-sm font-bold text-primary">Popular Routes</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {popularRoutes.map((route, i) => (
            <motion.button
              key={route.code}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              onClick={() => selectRoute(route)}
              className="rounded-lg border border-border p-3 text-left transition-all duration-200 hover:border-irctc-300 hover:bg-secondary"
            >
              <div className="mb-0.5 text-xs font-bold text-primary">{route.from} → {route.to}</div>
              <div className="text-2xs text-muted-foreground">{route.trains}</div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Stats with Anime.js CountUp counters + GSAP reveal */
function StatsBanner() {
  const ref = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="mx-auto max-w-[1200px] px-4 py-10">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-irctc-700 to-irctc-600 py-8 dark:from-irctc-900 dark:to-irctc-800">
        <div className="grid grid-cols-3 gap-4 px-6 text-center text-white">
          {[
            { value: 0, label: 'Double Bookings', suffix: '', format: (n: number) => `${n}` },
            { value: 100, label: 'Fair Chance', suffix: '%', format: (n: number) => `${n}%` },
            { value: 5, label: 'Seat Lock', suffix: ' min', format: (n: number) => `${n} min` },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-mono text-2xl font-black md:text-3xl">
                <CountUp to={s.value} format={s.format} />
              </p>
              <p className="text-2xs uppercase tracking-wider text-white/60">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
