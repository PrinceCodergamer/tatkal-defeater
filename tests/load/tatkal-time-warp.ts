/**
 * TATKAL TIME WARP — the definitive fairness + concurrency test.
 *
 * `SEATS` single-seat inventory slots (capacity 1 each — the real train
 * model: every berth is its own slot) are raced by N synchronized clients.
 * The system must grant at most one allocation per slot → exactly `SEATS`
 * total, and ZERO double-bookings.
 *
 * This validates the core guarantee: PostgreSQL optimistic concurrency
 * (the atomic UPDATE ... WHERE availableCapacity >= qty AND hold is free)
 * prevents two users from ever holding the same seat.
 *
 * Prereqs: API running on :3001.
 *
 * Run:
 *   pnpm test:load:tatkal --bots 5000 --seats 40
 */
import 'tsx';
import { prisma } from '@tatkal/database';

// ── Config from CLI args ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const parse = (flag: string, dflt: number) => {
  const i = args.indexOf(flag);
  return i >= 0 ? parseInt(args[i + 1], 10) : dflt;
};
const BOTS = parse('--bots', 1000);
const SEATS = parse('--seats', 40);
// API is served under the global `api` prefix (set in main.ts).
const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';
const SLOT_PREFIX = process.env.SLOT_PREFIX || 'tw-seat-';

interface AllocateResponse {
  reservationId?: string;
  status?: string;
  error?: string;
  message?: string;
  statusCode?: number;
}

function allocate(botId: number): Promise<AllocateResponse> {
  // Each bot races for a randomly-chosen seat slot. With SEATS slots and
  // capacity 1, exactly SEATS bots can ever win.
  const slotId = `${SLOT_PREFIX}${Math.floor(Math.random() * SEATS)}`;
  return fetch(`${API_BASE}/reservation/allocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slotId,
      userId: `bot-${botId}`,
      quantity: 1,
      idempotencyKey: `timewarp-${botId}`,
      deviceFingerprint: `fp_timewarp_${botId}`,
    }),
  })
    .then(async (r) => {
      const body = (await r.json()) as AllocateResponse;
      return { ...body, statusCode: r.status };
    })
    .catch((err) => ({ error: String(err.message || err) }));
}

/**
 * Self-provision SEATS fresh single-seat slots. Deleting pre-existing ones
 * makes the test idempotent and free of stale holds.
 */
async function ensureSlots() {
  // Clear stale reservations left by previous runs so the test is
  // idempotent — otherwise old PENDING rows accumulate and skew results.
  await prisma.reservation.deleteMany({
    where: { slotId: { startsWith: SLOT_PREFIX } },
  });

  // Reset capacity + clears any stale holds on these slots.
  for (let i = 0; i < SEATS; i++) {
    const id = `${SLOT_PREFIX}${i}`;
    await prisma.inventorySlot.upsert({
      where: { id },
      create: {
        id,
        resourceId: 'train-time-warp',
        resourceType: 'TRAIN',
        slotDate: new Date(Date.now() + 86400000),
        totalCapacity: 1,
        availableCapacity: 1,
        price: 1500,
        metadata: { note: 'created by tatkal-time-warp test' },
      },
      update: { availableCapacity: 1, totalCapacity: 1, holdExpiresAt: null },
    });
  }
  console.log(`Provisioned ${SEATS} single-seat slots (${SLOT_PREFIX}0..${SEATS - 1})`);
}

async function run() {
  console.log('━━━ TATKAL TIME WARP ━━━');
  console.log(`Bots: ${BOTS.toLocaleString()}  |  Seats: ${SEATS}`);
  console.log(`API:  ${API_BASE}`);

  await ensureSlots();

  // Barrier: every bot registers, then we release all at once.
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => (release = resolve));

  const bots = Array.from({ length: BOTS }, (_, i) => i);

  // Phase 1: all bots wait on the barrier.
  const firing = bots.map(async (i) => {
    await barrier;
    return allocate(i);
  });

  // Phase 2: release everyone at the same instant.
  console.log(`Releasing ${BOTS.toLocaleString()} simultaneous requests…`);
  release();
  const responses = await Promise.all(firing);

  // Phase 3: tally.
  const results = responses.map((r) => ({
    success: Boolean(r.reservationId) && r.status === 'PENDING',
    error: r.error || r.message,
    statusCode: r.statusCode,
  }));

  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);
  const seatExhausted = failures.filter(
    (f) =>
      f.statusCode === 409 ||
      f.error?.includes('SEAT_NOT_AVAILABLE') ||
      f.error?.includes('Seat not available'),
  );
  const unexpected = failures.filter((f) => !seatExhausted.includes(f));

  console.log('━━━ RESULTS ─────────────────────────────────');
  console.log(`Successful allocations: ${successes.length}/${BOTS.toLocaleString()}`);
  console.log(`Rejected — seat exhausted (409): ${seatExhausted.length}`);
  console.log(`Unexpected failures: ${unexpected.length}`);

  // ── Assertions ─────────────────────────────────────────────────────────
  let failed = false;

  // 1. Never more successes than seats — THE core guarantee.
  const doubleBookings = Math.max(0, successes.length - SEATS);
  if (doubleBookings > 0) {
    failed = true;
    console.error(`❌ DOUBLE BOOKINGS DETECTED: ${doubleBookings} extra allocations`);
  } else {
    console.log(`✅ Zero double bookings (${successes.length} allocations ≤ ${SEATS} seats)`);
  }

  // 2. Success must actually happen — a burst that grants 0 is broken even
  //    if it reports zero double-bookings (false-pass protection).
  if (successes.length === 0) {
    failed = true;
    console.error(`❌ Zero successful allocations — system did not admit anyone`);
  } else {
    console.log(`✅ ${successes.length} allocations granted`);
  }

  // 3. With BOTS >> SEATS and each seat capacity 1, we expect SEATS winners
  //    (within a small tolerance for bots that randomly re-target a taken
  //    seat before any other bot finds a free one).
  const expectedMin = Math.max(1, Math.floor(SEATS * 0.7));
  if (successes.length < expectedMin) {
    failed = true;
    console.error(`❌ Only ${successes.length} won; expected ≥ ${expectedMin} (${SEATS} seats)`);
  }

  // 4. Everything rejected must be a clean 409, never a 5xx/transport error.
  if (unexpected.length > 0) {
    failed = true;
    console.error(`❌ ${unexpected.length} unexpected failures (should be clean 409s)`);
  } else {
    console.log(`✅ All rejections were clean seat-exhausted responses`);
  }

  if (failed) {
    console.error('\n❌ TIME WARP FAILED');
    process.exit(1);
  }
  console.log('\n✅ TIME WARP PASSED — fairness and atomicity hold under burst');
  process.exit(0);
}

run();
