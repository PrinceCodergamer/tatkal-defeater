'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', path: '/', icon: '🏠' },
    { label: 'Train Search', path: '/', icon: '🚄' },
  ];

  return (
    <>
      {/* Top Bar */}
      <div className="irctc-topbar">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-center gap-4 text-xs">
          <span>🇮🇳 Indian Railways</span>
          <span className="opacity-40">|</span>
          <span>🔒 Fair Booking System</span>
          <span className="opacity-40">|</span>
          <span>🎲 Random Lottery Admission</span>
        </div>
      </div>

      {/* Main Header */}
      <header className="irctc-header">
        <div className="irctc-header-inner">
          <div className="flex items-center gap-8">
            <button onClick={() => router.push('/')} className="irctc-logo">
              <div className="irctc-logo-icon">
                <span>🚆</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-base font-bold leading-tight tracking-wide">IRCTC</div>
                <div className="text-2xs opacity-70 uppercase tracking-[0.15em] font-semibold">
                  Tatkal Booking
                </div>
              </div>
            </button>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.path)}
                  className={`irctc-nav-item ${pathname === item.path ? 'active' : ''}`}
                >
                  <span className="irctc-nav-icon">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="irctc-badge border border-orange-400/40 bg-orange-500/15 text-orange-300">
              🎲 FAIR
            </span>
            <ThemeToggle />
            <button
              className="md:hidden irctc-nav-item"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="text-lg">{menuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 bg-irctc-800/95 backdrop-blur-sm">
            <div className="max-w-[1200px] mx-auto px-6 py-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => { router.push(item.path); setMenuOpen(false); }}
                  className="w-full text-left irctc-nav-item text-sm"
                >
                  <span className="irctc-nav-icon">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Sub Navigation */}
      <div className="irctc-subnav">
        <div className="irctc-subnav-inner">
          <span className="irctc-subnav-item active">Book Ticket</span>
          <span className="irctc-subnav-item">PNR Status</span>
          <span className="irctc-subnav-item">Train Schedule</span>
          <span className="irctc-subnav-item">Cancellation</span>
          <span className="irctc-subnav-item hidden sm:inline">Track Train</span>
          <span className="irctc-subnav-item hidden sm:inline">Holiday Packages</span>
        </div>
      </div>
    </>
  );
}
