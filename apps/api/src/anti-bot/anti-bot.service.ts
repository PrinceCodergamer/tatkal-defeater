import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { prisma } from '@tatkal/database';

@Injectable()
export class AntibotService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Check rate limits per device fingerprint and IP
   */
  async checkRateLimit(deviceFingerprint: string, ip: string): Promise<{
    allowed: boolean;
    retryAfterMs: number;
    reason?: string;
  }> {
    // Per-fingerprint rate limit
    const fpKey = `ratelimit:fp:${deviceFingerprint}`;
    const fpCount = await this.redis.incr(fpKey);
    if (fpCount === 1) await this.redis.expire(fpKey, 60);

    if (fpCount > 30) {
      // 30 requests/minute per fingerprint
      return { allowed: false, retryAfterMs: 30000, reason: 'Device rate limit exceeded' };
    }

    // Per-IP rate limit
    const ipKey = `ratelimit:ip:${ip}`;
    const ipCount = await this.redis.incr(ipKey);
    if (ipCount === 1) await this.redis.expire(ipKey, 60);

    if (ipCount > 100) {
      return { allowed: false, retryAfterMs: 30000, reason: 'IP rate limit exceeded' };
    }

    return { allowed: true, retryAfterMs: 0 };
  }

  /**
   * Track device fingerprint for anomaly detection
   */
  async trackFingerprint(
    userId: string,
    deviceFingerprint: string,
  ): Promise<void> {
    // Check if this fingerprint is associated with many accounts
    const fpAccounts = `fp:accounts:${deviceFingerprint}`;
    await this.redis.sadd(fpAccounts, userId);
    const accountCount = await this.redis.scard(fpAccounts);

    // If 10+ accounts share the same fingerprint, flag them
    if (accountCount >= 10) {
      // Flag all associated accounts
      const accounts = await this.redis.smembers(fpAccounts);
      for (const id of accounts) {
        await prisma.userTrustProfile.upsert({
          where: { userId: id },
          update: {
            trustLevel: 'FLAGGED',
            violationCount: { increment: 1 },
            lastViolationAt: new Date(),
            associatedAccounts: accountCount,
          },
          create: {
            userId: id,
            trustLevel: 'FLAGGED',
            violationCount: 1,
            lastViolationAt: new Date(),
            associatedAccounts: accountCount,
            dailyBookingResetAt: new Date(),
          },
        });
      }
    }
  }

  /**
   * Check user trust level before allowing queue entry
   */
  async checkTrustLevel(userId: string): Promise<{
    allowed: boolean;
    trustLevel: string;
    message?: string;
  }> {
    const trust = await prisma.userTrustProfile.findUnique({
      where: { userId },
    });

    if (!trust) return { allowed: true, trustLevel: 'NORMAL' };

    if (trust.trustLevel === 'BANNED') {
      return { allowed: false, trustLevel: 'BANNED', message: 'Account restricted' };
    }

    if (trust.trustLevel === 'RESTRICTED' && trust.restrictedUntil) {
      if (trust.restrictedUntil > new Date()) {
        return {
          allowed: false,
          trustLevel: 'RESTRICTED',
          message: `Restricted until ${trust.restrictedUntil.toISOString()}`,
        };
      }
    }

    return { allowed: true, trustLevel: trust.trustLevel };
  }
}
