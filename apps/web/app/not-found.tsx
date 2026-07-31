'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrainFront, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-irctc-700 to-irctc-900 text-white shadow-modal"
        >
          <TrainFront className="h-10 w-10" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="font-mono text-sm font-bold tracking-widest text-orange-500">
            404 · OFF THE TRACKS
          </p>
          <h1 className="mt-2 text-3xl font-black text-foreground md:text-4xl">
            This station doesn&apos;t exist.
          </h1>
          <p className="prose-width mx-auto mt-3 text-sm text-muted-foreground md:text-base">
            The page you&apos;re looking for has been shunted to a siding. Let&apos;s get you
            back on the main line.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link href="/" className="irctc-btn irctc-btn-primary px-6 py-2.5">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <Link href="/" className="irctc-btn irctc-btn-outline px-6 py-2.5">
            <Search className="h-4 w-4" /> Search Trains
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
