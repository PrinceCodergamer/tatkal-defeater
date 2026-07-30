'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const popularRoutes = [
  { from: 'New Delhi', to: 'Mumbai Central', code: 'NDLS-BCT', trains: 'Rajdhani, Shatabdi' },
  { from: 'Howrah', to: 'New Delhi', code: 'HWH-NDLS', trains: 'Howrah Rajdhani, Poorva Exp' },
  { from: 'Chennai Central', to: 'Bangalore', code: 'MAS-SBC', trains: 'Chennai Exp, Shatabdi' },
  { from: 'Mumbai Central', to: 'Ahmedabad', code: 'BCT-ADI', trains: 'Shatabdi, Gujarat Exp' },
];

const features = [
  { icon: '🎲', title: 'Random Lottery', desc: 'Not first-come-first-served. Everyone has equal chance.' },
  { icon: '🔒', title: '5-Min Seat Lock', desc: 'Seat held while you fill details. No rush.' },
  { icon: '🛡️', title: 'Bot Protected', desc: 'Device fingerprinting keeps scalpers out.' },
  { icon: '⚡', title: 'Atomic Booking', desc: 'Database locks prevent double booking.' },
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

  // Set default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const filteredFrom = from ? stations.filter(s => s.toLowerCase().includes(from.toLowerCase()) && s !== to) : [];
  const filteredTo = to ? stations.filter(s => s.toLowerCase().includes(to.toLowerCase()) && s !== from) : [];

  function swapStations() { setFrom(to); setTo(from); }

  function selectRoute(route: typeof popularRoutes[0]) {
    setFrom(route.from);
    setTo(route.to);
  }

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
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch {
      setError('Server unreachable. Is the API running?');
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
        router.push(`/waiting-room?tokenId=${data.tokenId}&position=${data.position}&total=${data.totalWaiting}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`);
      } else {
        setError(data.error || 'Failed to enter queue');
      }
    } catch {
      setError('Server unreachable. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      {/* ── Hero / Search Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-irctc-700 via-irctc-600 to-irctc-800">
        {/* Animated train */}
        <div className="absolute top-12 left-0 text-4xl opacity-[0.08] pointer-events-none" style={{ animation: 'trainSlide 12s linear infinite' }}>
          🚄🚃🚃🚃🚃🚃
        </div>

        <div className="max-w-[1200px] mx-auto px-4 pt-12 pb-16 md:pt-16 md:pb-20">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">
              Book Train Tickets{' '}
              <span className="text-orange-300">Fairly</span>
            </h1>
            <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              No more bots snatching your confirmed ticket. Our random lottery system gives every passenger
              an equal chance — regardless of internet speed, auto-fill bots, or click speed.
            </p>
          </motion.div>

          {/* ── Search Card ── */}
          <motion.div
            className="irctc-search-card max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="irctc-search-header">
              <span className="text-white text-lg">🔍</span>
              <div>
                <h2 className="text-white font-bold text-sm">Search Trains</h2>
                <p className="text-white/60 text-xs">Enter your journey details</p>
              </div>
            </div>

            <div className="irctc-search-body">
              {/* Station Inputs */}
              <div className="irctc-search-row">
                <div>
                  <label className="irctc-label">From</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter source station"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="irctc-input pr-8"
                      autoComplete="off"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm">📍</span>
                    {filteredFrom.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-lg shadow-dropdown z-20 mt-1 max-h-48 overflow-y-auto">
                        {filteredFrom.map((s) => (
                          <button
                            key={s}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-irctc-50 transition-colors"
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
                  <button onClick={swapStations} className="irctc-swap shrink-0" title="Swap stations" type="button">
                    ⇄
                  </button>
                </div>

                <div>
                  <label className="irctc-label">To</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter destination station"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="irctc-input pr-8"
                      autoComplete="off"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm">🎯</span>
                    {filteredTo.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-lg shadow-dropdown z-20 mt-1 max-h-48 overflow-y-auto">
                        {filteredTo.map((s) => (
                          <button
                            key={s}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-irctc-50 transition-colors"
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

              {/* Date & Class */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="irctc-label">Date of Journey</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="irctc-input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="irctc-label">Class</label>
                  <select value={travelClass} onChange={(e) => setTravelClass(e.target.value)} className="irctc-select">
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
                  <label className="irctc-label">Tatkal Quota</label>
                  <select className="irctc-select">
                    <option value="general">General</option>
                    <option value="tatkal">Tatkal</option>
                    <option value="premium-tatkal">Premium Tatkal</option>
                    <option value="ladies">Ladies</option>
                  </select>
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-danger bg-danger-bg px-3 py-2 rounded-md mb-4"
                >
                  ❌ {error}
                </motion.p>
              )}

              {/* Verification Flow */}
              <AnimatePresence mode="wait">
                {step === 'search' && (
                  <motion.div key="search" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <button onClick={handleSearch} className="irctc-btn irctc-btn-primary w-full py-3 text-base">
                      🔍 Search Trains
                    </button>
                  </motion.div>
                )}

                {step === 'verify' && (
                  <motion.div key="verify" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                    <div className="bg-irctc-50 border border-irctc-200 rounded-lg p-3 text-xs text-irctc-700 flex items-center gap-2">
                      <span>🛡️</span>
                      <span>One-time verification before entering the queue. No OTP during booking.</span>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="irctc-label">Mobile Number</label>
                        <input
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
                        <button
                          onClick={handleVerify}
                          disabled={phone.length !== 10 || loading}
                          className="irctc-btn irctc-btn-orange h-[42px]"
                        >
                          {loading ? '⏳' : 'Verify →'}
                        </button>
                      </div>
                    </div>
                    <button onClick={() => setStep('search')} className="text-xs text-text-muted hover:text-text-secondary transition-colors">
                      ← Back to search
                    </button>
                  </motion.div>
                )}

                {step === 'ready' && (
                  <motion.div key="ready" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                    <div className="bg-success-bg border border-success/20 rounded-lg p-3 flex items-center gap-3">
                      <span className="text-lg">✅</span>
                      <div>
                        <p className="text-sm font-semibold text-success">Identity Verified</p>
                        <p className="text-xs text-text-muted">+91 {phone}</p>
                      </div>
                    </div>
                    <div className="bg-irctc-50 rounded-lg p-3 text-xs text-irctc-700 flex items-center gap-2">
                      <span>🚄</span>
                      <span><strong>{from}</strong> → <strong>{to}</strong> on {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <button onClick={handleSearch} disabled={loading} className="irctc-btn irctc-btn-orange w-full py-3 text-base">
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Entering Fair Queue...
                        </span>
                      ) : (
                        '🎯 Enter Fair Waiting Room'
                      )}
                    </button>
                    <p className="text-[10px] text-text-muted text-center">
                      Random lottery admission — everyone in the first 2 seconds has equal probability
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="irctc-search-footer">
              <span className="text-xs text-text-muted">
                🎲 Fair lottery system — bots have <strong>same</strong> chance as humans
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Popular Routes ── */}
      <section className="max-w-[1200px] mx-auto px-4 -mt-6 mb-8">
        <div className="irctc-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔥</span>
            <h3 className="text-sm font-bold text-irctc-700">Popular Routes</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {popularRoutes.map((route, i) => (
              <motion.button
                key={route.code}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => selectRoute(route)}
                className="text-left p-3 rounded-lg border border-border hover:border-irctc-300 hover:bg-irctc-50 transition-all duration-200"
              >
                <div className="text-xs font-bold text-irctc-700 mb-0.5">{route.from} → {route.to}</div>
                <div className="text-[10px] text-text-muted">{route.trains}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="max-w-[1200px] mx-auto px-4 mb-8">
        <motion.div className="text-center mb-6" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <h2 className="text-xl font-black text-irctc-700">How Fair Booking Works</h2>
          <p className="text-xs text-text-muted mt-1">No bots. No scalpers. Just fair random lottery admission.</p>
        </motion.div>

        <div className="grid md:grid-cols-5 gap-4">
          {[
            { step: '1', title: 'Search Train', desc: 'Enter your journey details and verify your identity.' },
            { step: '2', title: 'Enter Queue', desc: 'Join the fair waiting room. Everyone has equal odds.' },
            { step: '3', title: 'Lottery Draw', desc: 'Random selection — no speed advantage possible.' },
            { step: '4', title: 'Seat Locked', desc: '5-minute hold. Fill passenger details without rush.' },
            { step: '5', title: 'Confirmed!', desc: 'Atomic locks prevent double booking. Guaranteed.' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              className="irctc-card p-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-full bg-irctc-100 text-irctc-700 flex items-center justify-center text-sm font-black mx-auto mb-2">
                {item.step}
              </div>
              <h4 className="text-sm font-bold text-text mb-1">{item.title}</h4>
              <p className="text-[11px] text-text-muted leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-white border-t border-border py-8 mb-0">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="irctc-card p-5"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <span className="text-2xl mb-2 block">{f.icon}</span>
                <h4 className="text-sm font-bold text-text mb-1">{f.title}</h4>
                <p className="text-xs text-text-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Banner ── */}
      <section className="bg-gradient-to-r from-irctc-700 to-irctc-600 py-6">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-3 gap-8 text-center text-white">
            {[
              { value: '0', label: 'Double Bookings' },
              { value: '100%', label: 'Fair Chance' },
              { value: '5 min', label: 'Seat Lock' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-[10px] text-white/60 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
