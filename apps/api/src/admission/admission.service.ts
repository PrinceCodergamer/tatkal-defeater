import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { TokenStatus } from '@prisma/client';
import { prisma } from '@tatkal/database';
import { QUEUE_SCRAMBLE_INTERVAL_MS } from '@tatkal/shared';
import * as crypto from 'crypto';

@Injectable()
export class AdmissionService {
  private readonly HMAC_SECRET = process.env.HMAC_SECRET || 'tatkal-dev-secret-change-in-prod';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Cryptographically-secure Fisher-Yates shuffle using Node.js crypto
   */
  private cryptoShuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Generate random index using crypto
      const buf = crypto.randomBytes(4);
      const rand = buf.readUInt32BE(0);
      const j = rand % (i + 1);
      // Swap
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Generate an HMAC-signed queue token
   */
  signToken(userId: string, sessionId: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    const payload = `${userId}:${sessionId}:${ts}`;
    const sig = crypto.createHmac('sha256', this.HMAC_SECRET).update(payload).digest('hex');
    return `${Buffer.from(payload).toString('base64')}.${sig}`;
  }

  verifyToken(signedToken: string): { userId: string; sessionId: string } | null {
    try {
      const [encodedPayload, sig] = signedToken.split('.');
      const payload = Buffer.from(encodedPayload, 'base64').toString();
      const expectedSig = crypto.createHmac('sha256', this.HMAC_SECRET).update(payload).digest('hex');
      if (sig !== expectedSig) return null;

      const [userId, sessionId] = payload.split(':');
      return { userId, sessionId };
    } catch {
      return null;
    }
  }

  /**
   * Enter the waiting queue — issues a signed token and records position
   */
  async enterQueue(
    userId: string,
    deviceFingerprint: string,
  ): Promise<{
    tokenId: string;
    signedToken: string;
    position: number;
    totalWaiting: number;
  }> {
    const sessionId = crypto.randomUUID();
    const token = this.signToken(userId, sessionId);

    // Store in DB
    const admissionToken = await prisma.admissionToken.create({
      data: {
        userId,
        sessionId,
        token,
        deviceFingerprint,
        status: TokenStatus.WAITING,
        expiresAt: new Date(Date.now() + 300_000), // 5 min TTL
      },
    });

    // Add to Redis waiting queue (sorted set by timestamp)
    const now = Date.now();
    await this.redis.zadd('queue:admission:waiting', now, admissionToken.id);

    // Get position
    const position = await this.redis.zrank('queue:admission:waiting', admissionToken.id);
    const totalWaiting = await this.redis.zcard('queue:admission:waiting');

    return {
      tokenId: admissionToken.id,
      signedToken: token,
      position: position !== null ? position + 1 : 0,
      totalWaiting,
    };
  }

  /**
   * Get current queue status
   */
  async getQueueStatus(tokenId: string): Promise<{
    position: number;
    totalWaiting: number;
    status: string;
  }> {
    const position = await this.redis.zrank('queue:admission:waiting', tokenId);
    const totalWaiting = await this.redis.zcard('queue:admission:waiting');

    const token = await prisma.admissionToken.findUnique({ where: { id: tokenId } });

    return {
      position: position !== null ? position + 1 : 0,
      totalWaiting,
      status: token?.status || TokenStatus.EXPIRED,
    };
  }

  /**
   * Run the admission lottery — called every 100ms
   * Uses cryptographically-secure random shuffle for true fairness
   */
  async runLotteryDraw(batchSize: number = 50): Promise<string[]> {
    const candidates = await this.redis.zrange('queue:admission:waiting', 0, -1);
    if (candidates.length === 0) return [];

    // Cryptographically-secure Fisher-Yates shuffle
    const shuffled = this.cryptoShuffle(candidates);
    const admitted: string[] = [];

    for (const tokenId of shuffled.slice(0, Math.min(batchSize, shuffled.length))) {
      const success = await this.tryAllocateSeat(tokenId);
      if (success) admitted.push(tokenId);
    }

    return admitted;
  }

  /**
   * Scramble the queue order — randomly re-scores all waiting entries
   * This prevents scalpers from predicting their admission time
   */
  async scrambleQueue(): Promise<number> {
    const waiting = await this.redis.zrange('queue:admission:waiting', 0, -1);
    if (waiting.length === 0) return 0;

    const pipeline = this.redis.pipeline();
    const now = Date.now();

    // Re-assign random timestamps within a 2-second window
    // This preserves relative fairness while making position unpredictable
    for (const id of waiting) {
      const newScore = now + Math.floor(Math.random() * 2000);
      pipeline.zadd('queue:admission:waiting', newScore, id);
    }

    await pipeline.exec();
    return waiting.length;
  }

  /**
   * Attempt to atomically allocate a seat for an admitted user
   */
  private async tryAllocateSeat(tokenId: string): Promise<boolean> {
    const token = await prisma.admissionToken.findUnique({ where: { id: tokenId } });
    if (!token || token.status !== TokenStatus.WAITING) return false;

    // Find an available slot (for demo: first available train slot)
    const slot = await prisma.$queryRawUnsafe<Array<{ id: string; version: number }>>(`
      SELECT id, version FROM "InventorySlot"
      WHERE "resourceType" = 'TRAIN'
        AND "availableCapacity" > 0
        AND ("holdExpiresAt" IS NULL OR "holdExpiresAt" < NOW())
        AND "slotDate" > NOW()
      ORDER BY RANDOM()
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);

    if (!slot || slot.length === 0) return false;

    const updated = await prisma.$executeRawUnsafe(`
      UPDATE "InventorySlot"
      SET "availableCapacity" = "availableCapacity" - 1,
          version = version + 1,
          "holdExpiresAt" = NOW() + INTERVAL '5 minutes'
      WHERE id = $1
        AND "availableCapacity" > 0
        AND version = $2
    `, slot[0].id, slot[0].version);

    if (updated === 0) return false;

    // Mark token as admitted
    await prisma.admissionToken.update({
      where: { id: tokenId },
      data: {
        status: TokenStatus.ADMITTED,
        admittedAt: new Date(),
      },
    });

    // Remove from waiting queue
    await this.redis.zrem('queue:admission:waiting', tokenId);

    // Create pending reservation
    await prisma.reservation.create({
      data: {
        userId: token.userId,
        resourceId: slot[0].id,
        slotId: slot[0].id,
        status: 'PENDING',
        holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        quantity: 1,
        totalPrice: 1500,
        idempotencyKey: `admit-${tokenId}`,
        deviceFingerprint: token.deviceFingerprint || undefined,
      },
    });

    return true;
  }

  /**
   * Release expired holds back to available pool (called by BullMQ worker)
   */
  async releaseExpiredHolds(): Promise<number> {
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "InventorySlot"
      SET "availableCapacity" = "availableCapacity" + 1,
          version = version + 1,
          "holdExpiresAt" = NULL
      WHERE "holdExpiresAt" < NOW()
        AND "holdExpiresAt" IS NOT NULL
    `);

    // Mark expired reservations
    await prisma.reservation.updateMany({
      where: {
        status: 'PENDING',
        holdExpiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    return result;
  }
}
