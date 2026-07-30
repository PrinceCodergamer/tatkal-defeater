'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'login' | 'verify' | 'ready'>('login');
  const [sessionToken, setSessionToken] = useState('');
  const [error, setError] = useState('');

  async function handleVerify() {
    setError('');
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();

    if (data.verified) {
      setSessionToken(data.sessionToken);
      setStep('ready');
    } else {
      setError(data.message || 'Verification failed');
    }
  }

  async function handleEnterQueue() {
    const fp = `fp_${Math.random().toString(36).slice(2)}`;
    const res = await fetch('/api/admission/enter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: phone,
        deviceFingerprint: fp,
      }),
    });
    const data = await res.json();

    if (data.tokenId) {
      router.push(`/waiting-room?tokenId=${data.tokenId}&position=${data.position}&total=${data.totalWaiting}`);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            🚆 Tatkal Defeater
          </h1>
          <p className="text-gray-500">
            Fair booking for everyone. No bots. No scalpers.
          </p>
        </div>

        {/* Step 1: Identity Verification */}
        {step === 'login' && (
          <div className="space-y-4 rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Verify your identity</h2>
            <p className="text-sm text-gray-500">
              One-time verification before entering the queue.
              No OTP during booking.
            </p>
            <input
              type="tel"
              placeholder="Enter your 10-digit phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={10}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              onClick={handleVerify}
              disabled={phone.length !== 10}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Verify & Continue
            </button>
          </div>
        )}

        {/* Step 2: Ready to Enter Queue */}
        {step === 'ready' && (
          <div className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-xl">✅</span>
              <h2 className="text-lg font-semibold text-green-800">
                Identity Verified
              </h2>
            </div>
            <p className="text-sm text-green-700">
              You are now verified. When tatkal opens, click below to enter
              the fair waiting room.
            </p>
            <button
              onClick={handleEnterQueue}
              className="w-full rounded-lg bg-green-600 px-4 py-3 text-white font-semibold text-lg hover:bg-green-700 transition shadow-md"
            >
              Enter Waiting Room 🎯
            </button>
            <p className="text-xs text-green-600 text-center">
              Random lottery admission — everyone has equal chance regardless of speed
            </p>
          </div>
        )}

        {/* Feature highlights */}
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
          <div className="rounded-lg border p-3">
            <div className="font-semibold text-gray-700 mb-1">🎲 Random Lottery</div>
            Not first-come-first-served. Fair for everyone.
          </div>
          <div className="rounded-lg border p-3">
            <div className="font-semibold text-gray-700 mb-1">🛡️ No CAPTCHA</div>
            Verified once at entry. Never during booking.
          </div>
          <div className="rounded-lg border p-3">
            <div className="font-semibold text-gray-700 mb-1">🔒 Seat Lock</div>
            Seat held for 5 min while you fill details.
          </div>
          <div className="rounded-lg border p-3">
            <div className="font-semibold text-gray-700 mb-1">🤖 Bot Defense</div>
            Device fingerprinting + rate limiting.
          </div>
        </div>
      </div>
    </main>
  );
}
