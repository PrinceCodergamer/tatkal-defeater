'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShieldCheck, Zap, Timer, Users, PlayCircle } from 'lucide-react';
import { LazyRailway } from '@/components/hero/lazy-railway';
import { MagneticButton } from '@/components/premium/magnetic-button';
import { Badge } from '@/components/ui/badge';

/**
 * HERO — the flagship moment.
 * Deep IRCTC blue gradient + lazy Three.js railway network + trust markers.
 * GSAP/framer entrance choreography; reduced-motion safe.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-irctc-900 via-irctc-800 to-irctc-950">
      {/* Three.js railway network (lazy — heavy bundle deferred) */}
      <LazyRailway className="opacity-70 dark:opacity-60" />

      {/* Soft radial glow for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, oklch(0.40 0.10 252 / 0.25), transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1200px] px-4 pb-20 pt-16 md:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <Badge
            variant="outline"
            className="mb-5 border-orange-400/40 bg-orange-500/10 px-3 py-1 text-orange-300"
          >
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" />
            Fair lottery admission · No bots, no scalpers
          </Badge>

          <h1 className="mx-auto max-w-3xl text-balance text-3xl font-black leading-heading text-white md:text-5xl">
            Book train tickets{' '}
            <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-orange-300 bg-clip-text text-transparent">
              fairly.
            </span>
          </h1>

          <p className="prose-width mx-auto mt-4 text-base text-white/70 md:text-lg">
            No more bots snatching your confirmed ticket. Our random lottery gives every
            passenger an equal chance — regardless of internet speed, auto-fill, or click rate.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <MagneticButton
              onClick={() => document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' })}
              className="irctc-btn irctc-btn-orange px-8 py-3 text-base"
            >
              <Zap className="h-4 w-4" />
              Search Trains
            </MagneticButton>
            <MagneticButton
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="irctc-btn px-8 py-3 text-base border border-white/30 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15"
            >
              How it works
            </MagneticButton>
          </div>
        </motion.div>

        {/* Trust markers */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mx-auto mt-14 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { icon: ShieldCheck, label: 'Bot protected' },
            { icon: Timer, label: '5-min seat lock' },
            { icon: Zap, label: 'Atomic booking' },
            { icon: Users, label: 'Equal for all' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/80 backdrop-blur-sm"
            >
              <Icon className="h-4 w-4 text-orange-400" />
              {label}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
