'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  ShieldCheck,
  Zap,
  Timer,
  Cloud,
  Server,
  Database,
  Network,
  Lock,
  Activity,
  Globe,
  Cpu,
  Github,
  BookOpen,
  CreditCard,
  Bell,
} from 'lucide-react';
import { TRAIN_COMPONENTS, COMPLETE_TRAIN, EXPLODED_TRAIN, FEATURE_COMPONENTS } from '@/lib/train-assets';

gsap.registerPlugin(ScrollTrigger);

const T = (asset: string) => `/train/${asset}`;

// Engineering components the story focuses on, in order.
const STORY_COMPONENTS = FEATURE_COMPONENTS
  .map((asset) => TRAIN_COMPONENTS.find((c) => c.asset === asset))
  .filter((c): c is NonNullable<typeof c> => Boolean(c));

/**
 * CHAPTER 5 — System Architecture SVG (animated data flow).
 */
function ArchitectureDiagram() {
  const nodes = [
    { id: 'gate', x: 8, y: 46, label: 'Admission Gate', icon: ShieldCheck, color: '#f37021' },
    { id: 'queue', x: 30, y: 20, label: 'Fair Queue', icon: Timer, color: '#4a90d9' },
    { id: 'id', x: 30, y: 70, label: 'Identity Verify', icon: Lock, color: '#4a90d9' },
    { id: 'engine', x: 54, y: 46, label: 'Reservation Engine', icon: Zap, color: '#f37021' },
    { id: 'cache', x: 76, y: 20, label: 'Redis Cache', icon: Server, color: '#4a90d9' },
    { id: 'db', x: 76, y: 70, label: 'PostgreSQL', icon: Database, color: '#27ae60' },
    { id: 'bus', x: 54, y: 88, label: 'Event Bus', icon: Network, color: '#b45309' },
  ];
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      {/* connection lines with animated dash */}
      {[
        ['gate', 'queue'], ['gate', 'id'], ['queue', 'engine'], ['id', 'engine'],
        ['engine', 'cache'], ['engine', 'db'], ['cache', 'db'], ['engine', 'bus'],
      ].map(([a, b], i) => {
        const na = nodes.find((n) => n.id === a)!;
        const nb = nodes.find((n) => n.id === b)!;
        return (
          <g key={i}>
            <line
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke="currentColor" strokeWidth="0.4" strokeDasharray="1 1"
              className="opacity-30"
            />
            <circle r="0.6" fill="#f37021" className="data-flow" style={{ ['--x' as string]: `${(nb.x - na.x) * 0.9}`, ['--y' as string]: `${(nb.y - na.y) * 0.9}` } as React.CSSProperties} />
          </g>
        );
      })}
      {nodes.map((n) => {
        const Icon = n.icon;
        return (
          <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
            <circle r="5" fill={n.color} opacity="0.15" />
            <circle r="2.4" fill={n.color} />
            <text y="-6" textAnchor="middle" fontSize="2.2" fill="currentColor" className="font-semibold">
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * CHAPTER 7 — Live simulation dashboard (animated).
 */
function LiveDashboard() {
  const [tps, setTps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [queue, setQueue] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setTps(Math.floor(400 + Math.random() * 250));
      setLatency(Math.floor(30 + Math.random() * 40));
      setQueue(Math.floor(12000 + Math.random() * 6000));
    }, 900);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: 'Transactions/s', value: tps, icon: Activity, color: '#f37021' },
        { label: 'P99 Latency', value: latency, suffix: 'ms', icon: Timer, color: '#4a90d9' },
        { label: 'In Queue', value: queue, icon: Server, color: '#27ae60' },
        { label: 'Uptime', value: 99.99, suffix: '%', icon: Globe, color: '#b45309' },
      ].map(({ label, value, icon: Icon, color, suffix }) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <Icon className="mb-2 h-4 w-4" style={{ color }} />
          <p className="font-mono text-xl font-black tabular-nums text-white md:text-2xl">
            {value.toLocaleString()}
            {suffix || ''}
          </p>
          <p className="mt-1 text-2xs uppercase tracking-wider text-white/50">{label}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Main scroll-driven experience.
 */
export default function ExperiencePage() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setReduced(true);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const pinned = pinnedRef.current;
    if (!wrap || !pinned || reduced) return;

    // Keep Lenis and ScrollTrigger in sync (lenis skill rule).
    ScrollTrigger.normalizeScroll(true);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const ctx = gsap.context(() => {
      // ── Timeline: 14 steps, each roughly one viewport of scroll ──
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: wrap,
          start: 'top top',
          end: '+=14000',
          pin: pinned,
          scrub: 0.8,
          anticipatePin: 1,
        },
      });

      // Chapter 1 → 2: hero exits, complete train flies in
      // NOTE: no infinite-repeat tweens in a scrubbed timeline — they corrupt
      // GSAP's progress mapping. The train float is a CSS animation instead.
      tl.to('.ch-hero', { opacity: 0, scale: 0.96, y: -40, duration: 1 })
        .fromTo('.ch-train-reveal', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 1.2 }, '<')
        .fromTo('.train-glow', { opacity: 0 }, { opacity: 1, duration: 1 }, '<')
        .to('.ch-train-reveal', { opacity: 0, scale: 1.06, duration: 1 }, '+=1.5')
        .fromTo('.ch-exploded', { opacity: 0 }, { opacity: 1, duration: 1 }, '<')
        .fromTo('.train-exploded', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.4 }, '<');

      // Chapter 3: exploded view stabilises, then narrative starts
      tl.to('.ch-exploded', { opacity: 0, duration: 1 }, '+=0.4');

      // Chapter 4: component storytelling loop (engineering parts)
      STORY_COMPONENTS.forEach((c, i) => {
        tl.fromTo(`.cmp-${i}`, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.8 }, i === 0 ? '<' : '+=0.3')
          .fromTo(`.cmp-label-${i}`, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.6 }, '<0.2')
          .to(`.cmp-${i}`, { opacity: 0, scale: 1.05, duration: 0.6 }, '+=1.6');
      });

      // Chapter 5: architecture
      tl.fromTo('.ch-arch', { opacity: 0 }, { opacity: 1, duration: 1 }, '+=0.3')
        .to('.ch-arch', { opacity: 0, duration: 0.8 }, '+=1.4');

      // Chapter 6: why
      tl.fromTo('.ch-why', { opacity: 0 }, { opacity: 1, duration: 1 }, '<0.4')
        .fromTo('.why-card', { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.6 }, '<0.3')
        .to('.ch-why', { opacity: 0, duration: 0.8 }, '+=1.4');

      // Chapter 7: simulation
      tl.fromTo('.ch-sim', { opacity: 0 }, { opacity: 1, duration: 1 }, '<0.4')
        .to('.ch-sim', { opacity: 0, duration: 0.8 }, '+=2');

      // Chapter 8: stack
      tl.fromTo('.ch-stack', { opacity: 0 }, { opacity: 1, duration: 1 }, '<0.4')
        .fromTo('.stack-chip', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, stagger: 0.06, duration: 0.5 }, '<0.2')
        .to('.ch-stack', { opacity: 0, duration: 0.8 }, '+=1.2');

      // Chapter 9: impact
      tl.fromTo('.ch-impact', { opacity: 0 }, { opacity: 1, duration: 1 }, '<0.4')
        .fromTo('.impact-card', { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.5 }, '<0.2')
        .to('.ch-impact', { opacity: 0, duration: 0.8 }, '+=1.2');

      // Chapter 10: final assembly — exploded → complete, zoom out
      tl.fromTo('.ch-assembly', { opacity: 0 }, { opacity: 1, duration: 1 }, '<0.4')
        .fromTo('.train-reassemble', { opacity: 0, scale: 1.4 }, { opacity: 1, scale: 1, duration: 1.4 }, '<')
        .to('.ch-assembly-inner', { scale: 0.92, opacity: 1, duration: 1 }, '+=0.4');

      // Final CTA
      tl.to('.ch-assembly', { opacity: 0, scale: 0.95, duration: 1 }, '+=0.6')
        .fromTo('.ch-final', { opacity: 0 }, { opacity: 1, duration: 1.2 }, '<0.3');
    }, wrap);

    return () => ctx.revert();
  }, [reduced]);

  if (reduced) {
    // Reduced motion: static stacked fallback — all content reachable.
    return (
      <div className="min-h-screen bg-[#05070d] px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl space-y-16">
          <header className="text-center">
            <h1 className="text-4xl font-black">Engineering Fairness at Planet Scale</h1>
            <p className="mt-4 text-white/60">A universal distributed reservation platform. Every section below is the full experience — static for reduced-motion users.</p>
          </header>
          <Image src={T(COMPLETE_TRAIN)} alt="Complete high-speed train" width={1024} height={576} className="w-full" />
          <section><h2 className="text-2xl font-bold">Built for millions</h2><p className="mt-2 text-white/60">Fair, reliable, scalable. The train is a metaphor — the same engineering discipline runs the software.</p></section>
          <section><ArchitectureDiagram /><p className="mt-4 text-sm text-white/50">Admission gate → fair queue → identity → reservation engine → Redis cache → PostgreSQL.</p></section>
          <button onClick={() => router.push('/')} className="irctc-btn irctc-btn-orange px-8 py-3 text-base">
            Enter Platform <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="bg-[#05070d] text-white">
      {/* Pin container */}
      <div ref={pinnedRef} className="relative h-screen overflow-hidden">
        {/* Persistent ambient background */}
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,#0a1630_0%,#05070d_60%)]" />
        <div className="absolute inset-0 opacity-30 [background:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:56px_56px]" />

        {/* ── Chapter 1: Hero ── */}
        <section className="ch-hero absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-white/70 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" />
            Universal Distributed Reservation Platform
          </div>
          <h1 className="text-balance text-4xl font-black leading-tight md:text-6xl">
            Fairness, engineered.{' '}
            <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-orange-300 bg-clip-text text-transparent">
              At scale.
            </span>
          </h1>
          <p className="prose-width mx-auto mt-5 text-base text-white/60 md:text-lg">
            A cinematic journey through the train and the software that powers it.
            Scroll to begin.
          </p>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="mt-10 text-white/50"
          >
            <ArrowDown className="h-6 w-6" />
          </motion.div>
          <button
            onClick={() => window.scrollTo({ top: 0 })}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 irctc-btn irctc-btn-orange px-8 py-3"
          >
            Begin Experience
          </button>
        </section>

        {/* ── Chapter 2: Complete train reveal ── */}
        <section className="ch-train-reveal absolute inset-0 flex flex-col items-center justify-center opacity-0 px-6">
          <div className="train-glow absolute h-[300px] w-[700px] rounded-full bg-orange-500/10 blur-[100px]" />
          <div className="train-big relative">
            <Image src={T(COMPLETE_TRAIN)} alt="Assembled high-speed electric train" width={1024} height={576} className="w-[min(90vw,900px)] drop-shadow-[0_40px_80px_rgba(0,0,0,0.6)]" priority />
          </div>
          <div className="mt-8 max-w-xl text-center">
            <h2 className="text-2xl font-bold md:text-3xl">Universal Distributed Reservation Platform</h2>
            <p className="mt-3 text-white/60">Built for millions of users. Fair. Reliable. Scalable.</p>
          </div>
        </section>

        {/* ── Chapter 3: Exploded view ── */}
        <section className="ch-exploded absolute inset-0 flex flex-col items-center justify-center opacity-0 px-6">
          <div className="train-exploded relative">
            <Image src={T(EXPLODED_TRAIN)} alt="Exploded view of the train's systems" width={1024} height={576} className="w-[min(92vw,950px)]" />
          </div>
          <h2 className="mt-6 text-xl font-bold md:text-2xl">Every system, engineered in place</h2>
          <p className="mt-2 max-w-md text-center text-white/60">Scroll to meet each component.</p>
        </section>

        {/* ── Chapter 4: Component storytelling ── */}
        {STORY_COMPONENTS.map((c, i) => (
          <section key={c.id} className={`cmp-${i} absolute inset-0 flex flex-col items-center justify-center opacity-0 px-6`}>
            <Image src={T(c.asset)} alt={c.name} width={1024} height={576} className="w-[min(88vw,880px)] drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)]" loading="lazy" />
            <div className={`cmp-label-${i} mt-6 max-w-md text-center opacity-0`}>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange-400">{c.spec}</p>
              <h2 className="mt-1 text-2xl font-bold md:text-3xl">{c.name}</h2>
              <p className="mt-2 text-white/60">{c.blurb}</p>
            </div>
          </section>
        ))}

        {/* ── Chapter 5: System architecture ── */}
        <section className="ch-arch absolute inset-0 flex flex-col items-center justify-center opacity-0 px-6">
          <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl">The software, mirrored</h2>
          <div className="w-[min(92vw,820px)] text-white/80">
            <ArchitectureDiagram />
          </div>
          <p className="mt-6 max-w-md text-center text-white/60">
            Every reservation flows admission → queue → identity → engine → cache → database, atomically.
          </p>
        </section>

        {/* ── Chapter 6: Why ── */}
        <section className="ch-why absolute inset-0 flex flex-col items-center justify-center opacity-0 px-6">
          <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl">Why this platform</h2>
          <div className="grid w-full max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: Timer, t: 'Fair Queue', d: 'Random lottery, zero bot advantage' },
              { icon: Zap, t: 'Zero Double Booking', d: 'Atomic SQL writes' },
              { icon: Globe, t: 'High Availability', d: 'Multi-region ready' },
              { icon: Server, t: 'Cloud Native', d: 'Containers + K8s' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="why-card rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <Icon className="mb-2 h-5 w-5 text-orange-400" />
                <h3 className="text-sm font-bold">{t}</h3>
                <p className="mt-1 text-xs text-white/50">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Chapter 7: Real-time simulation ── */}
        <section className="ch-sim absolute inset-0 flex flex-col items-center justify-center opacity-0 px-6">
          <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl">Millions of users, live</h2>
          <LiveDashboard />
          <p className="mt-6 text-xs text-white/40">Real-time simulation — transactions, latency, queue depth, uptime.</p>
        </section>

        {/* ── Chapter 8: Technology stack ── */}
        <section className="ch-stack absolute inset-0 flex flex-col items-center justify-center opacity-0 px-6">
          <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl">The stack</h2>
          <div className="flex max-w-3xl flex-wrap justify-center gap-3">
            {['NestJS', 'TypeScript', 'PostgreSQL', 'Prisma', 'Redis', 'BullMQ', 'Docker', 'Kubernetes', 'Prometheus', 'Grafana', 'OpenTelemetry', 'Socket.io'].map((s) => (
              <span key={s} className="stack-chip rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm backdrop-blur-sm">
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* ── Chapter 9: Impact ── */}
        <section className="ch-impact absolute inset-0 flex flex-col items-center justify-center opacity-0 px-6">
          <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl">Industries served</h2>
          <div className="grid w-full max-w-3xl grid-cols-3 gap-3 md:grid-cols-6">
            {['Railways', 'Flights', 'Healthcare', 'Universities', 'Government', 'Concerts', 'Hotels', 'Visa', 'EV Charging', 'Flash Sales', 'Gov Services', 'Events'].map((s) => (
              <div key={s} className="impact-card rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-center backdrop-blur-sm">
                <span className="text-xs font-semibold">{s}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Chapter 10: Final assembly ── */}
        <section className="ch-assembly absolute inset-0 flex flex-col items-center justify-center px-6">
          <div className="ch-assembly-inner flex flex-col items-center">
            <Image src={T(COMPLETE_TRAIN)} alt="Train reassembled" width={1024} height={576} className="train-reassemble w-[min(90vw,900px)] opacity-0 drop-shadow-[0_40px_90px_rgba(243,112,33,0.25)]" />
            <h2 className="mt-8 text-center text-3xl font-black md:text-5xl">
              Engineering Fairness at{' '}
              <span className="bg-gradient-to-r from-orange-300 to-orange-400 bg-clip-text text-transparent">Planet Scale.</span>
            </h2>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="ch-final absolute inset-0 flex flex-col items-center justify-center opacity-0 px-6 text-center">
          <h2 className="text-balance max-w-2xl text-3xl font-black md:text-5xl">
            Ready to experience the future of reservation systems?
          </h2>
          <button
            onClick={() => router.push('/')}
            className="irctc-btn irctc-btn-orange mt-10 px-10 py-4 text-lg"
          >
            Enter Platform <ArrowRight className="h-5 w-5" />
          </button>
          <p className="mt-4 text-xs text-white/40">No reload — a seamless transition.</p>
        </section>
      </div>
    </div>
  );
}
