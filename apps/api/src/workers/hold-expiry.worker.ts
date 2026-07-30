import { prisma } from '@tatkal/database';

/**
 * Simple interval-based worker that releases expired holds every 30 seconds.
 * BullMQ v5 Worker doesn't support `repeat` in options — a plain setInterval
 * is cleaner for this periodic cleanup job.
 */
async function releaseExpiredHolds(): Promise<void> {
  try {
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "InventorySlot"
      SET available_capacity = available_capacity + 1,
          version = version + 1,
          hold_expires_at = NULL
      WHERE hold_expires_at < NOW()
        AND hold_expires_at IS NOT NULL
    `);

    const expired = await prisma.reservation.updateMany({
      where: {
        status: 'PENDING',
        holdExpiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    if (result > 0 || expired.count > 0) {
      console.log(`🔄 Released ${result} seats, expired ${expired.count} reservations`);
    }
  } catch (err) {
    console.error('❌ Hold expiry error:', err);
  }
}

// Run immediately, then every 30 seconds
releaseExpiredHolds();
setInterval(releaseExpiredHolds, 30_000);

console.log('🔄 Hold expiry worker started (checking every 30s)');
