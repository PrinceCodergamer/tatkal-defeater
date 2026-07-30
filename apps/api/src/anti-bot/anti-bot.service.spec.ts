import { Test, TestingModule } from '@nestjs/testing';
import { AntibotService } from './anti-bot.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { prisma as _prisma } from '@tatkal/database';
const mockPrisma = _prisma as any;

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRedis = {
  incr: jest.fn(),
  expire: jest.fn(),
  sadd: jest.fn(),
  scard: jest.fn(),
  smembers: jest.fn(),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    incr: jest.fn(),
    expire: jest.fn(),
    sadd: jest.fn(),
    scard: jest.fn(),
    smembers: jest.fn(),
  })),
}));

jest.mock('@tatkal/database', () => ({
  prisma: {
    userTrustProfile: { upsert: jest.fn(), findUnique: jest.fn() },
  },
}));

// ── Suite ──────────────────────────────────────────────────────────────────

describe('AntibotService', () => {
  let service: AntibotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AntibotService,
        {
          provide: REDIS_CLIENT,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<AntibotService>(AntibotService);
    jest.clearAllMocks();
  });

  // ── checkRateLimit ─────────────────────────────────────────────────────

  describe('checkRateLimit', () => {
    const fingerprint = 'fp-device-abc';
    const ip = '192.168.1.1';

    it('should allow the first request from a fingerprint and set TTL', async () => {
      mockRedis.incr.mockResolvedValueOnce(1); // fp count
      mockRedis.incr.mockResolvedValueOnce(1); // ip count

      const result = await service.checkRateLimit(fingerprint, ip);

      expect(result).toEqual({ allowed: true, retryAfterMs: 0 });
      // TTL should be set for fp key on first access
      expect(mockRedis.expire).toHaveBeenCalledWith(
        `ratelimit:fp:${fingerprint}`,
        60,
      );
    });

    it('should set TTL on first IP access too', async () => {
      mockRedis.incr.mockResolvedValueOnce(1); // fp count
      mockRedis.incr.mockResolvedValueOnce(1); // ip count — first ever

      await service.checkRateLimit(fingerprint, ip);

      expect(mockRedis.expire).toHaveBeenCalledWith(
        `ratelimit:ip:${ip}`,
        60,
      );
    });

    it('should not set TTL on subsequent requests', async () => {
      mockRedis.incr.mockResolvedValueOnce(5); // fp count
      mockRedis.incr.mockResolvedValueOnce(3); // ip count

      await service.checkRateLimit(fingerprint, ip);

      // expire is only called when incr returns 1
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should block when fingerprint exceeds 30 requests/minute', async () => {
      mockRedis.incr.mockResolvedValueOnce(31); // fp count exceeds limit
      // Second incr (ip) is never called because we return early

      const result = await service.checkRateLimit(fingerprint, ip);

      expect(result).toEqual({
        allowed: false,
        retryAfterMs: 30000,
        reason: 'Device rate limit exceeded',
      });
      // IP key should NOT be incremented if fp already blocked
      expect(mockRedis.incr).toHaveBeenCalledTimes(1);
    });

    it('should block when IP exceeds 100 requests/minute', async () => {
      mockRedis.incr.mockResolvedValueOnce(15);  // fp within limit
      mockRedis.incr.mockResolvedValueOnce(101); // ip exceeds limit

      const result = await service.checkRateLimit(fingerprint, ip);

      expect(result).toEqual({
        allowed: false,
        retryAfterMs: 30000,
        reason: 'IP rate limit exceeded',
      });
    });

    it('should allow requests within both limits', async () => {
      mockRedis.incr.mockResolvedValueOnce(20);  // fp within limit (≤30)
      mockRedis.incr.mockResolvedValueOnce(50);  // ip within limit (≤100)

      const result = await service.checkRateLimit(fingerprint, ip);

      expect(result).toEqual({ allowed: true, retryAfterMs: 0 });
    });

    it('should use correct Redis key formats', async () => {
      mockRedis.incr.mockResolvedValueOnce(1);
      mockRedis.incr.mockResolvedValueOnce(1);

      await service.checkRateLimit(fingerprint, ip);

      expect(mockRedis.incr).toHaveBeenNthCalledWith(
        1,
        `ratelimit:fp:${fingerprint}`,
      );
      expect(mockRedis.incr).toHaveBeenNthCalledWith(
        2,
        `ratelimit:ip:${ip}`,
      );
    });

    it('should handle different fingerprints independently', async () => {
      // Fingerprint A: first request
      mockRedis.incr.mockResolvedValueOnce(1);
      mockRedis.incr.mockResolvedValueOnce(1);
      const resultA = await service.checkRateLimit('fp-A', ip);
      expect(resultA.allowed).toBe(true);

      jest.clearAllMocks();

      // Fingerprint B: first request
      mockRedis.incr.mockResolvedValueOnce(1);
      mockRedis.incr.mockResolvedValueOnce(1);
      const resultB = await service.checkRateLimit('fp-B', ip);
      expect(resultB.allowed).toBe(true);
    });
  });

  // ── trackFingerprint ───────────────────────────────────────────────────

  describe('trackFingerprint', () => {
    const fingerprint = 'fp-suspicious';
    const userId = 'user-42';

    it('should add the user to the fingerprint account set', async () => {
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.scard.mockResolvedValue(1); // Only 1 account so far

      await service.trackFingerprint(userId, fingerprint);

      expect(mockRedis.sadd).toHaveBeenCalledWith(
        `fp:accounts:${fingerprint}`,
        userId,
      );
    });

    it('should not flag accounts when under threshold (9 accounts)', async () => {
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.scard.mockResolvedValue(9); // Below threshold of 10

      await service.trackFingerprint(userId, fingerprint);

      expect(mockPrisma.userTrustProfile.upsert).not.toHaveBeenCalled();
    });

    it('should flag all associated accounts when threshold (10+) is reached', async () => {
      const associatedAccounts = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5',
        'user-6', 'user-7', 'user-8', 'user-9', 'user-42'];

      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.scard.mockResolvedValue(10); // At threshold
      mockRedis.smembers.mockResolvedValue(associatedAccounts);
      mockPrisma.userTrustProfile.upsert.mockResolvedValue({});

      await service.trackFingerprint(userId, fingerprint);

      // Should upsert for every associated account
      expect(mockPrisma.userTrustProfile.upsert).toHaveBeenCalledTimes(10);
      for (const id of associatedAccounts) {
        expect(mockPrisma.userTrustProfile.upsert).toHaveBeenCalledWith({
          where: { userId: id },
          update: expect.objectContaining({
            trustLevel: 'FLAGGED',
            violationCount: { increment: 1 },
            lastViolationAt: expect.any(Date),
            associatedAccounts: 10,
          }),
          create: expect.objectContaining({
            userId: id,
            trustLevel: 'FLAGGED',
            violationCount: 1,
            lastViolationAt: expect.any(Date),
            associatedAccounts: 10,
            dailyBookingResetAt: expect.any(Date),
          }),
        });
      }
    });

    it('should skip upsert when threshold is barely under (9 accounts)', async () => {
      // After sadd, scard reports 9 — but we only check scard,
      // not the sadd result. For accuracy, we trust scard.
      mockRedis.sadd.mockResolvedValue(0); // Already in set
      mockRedis.scard.mockResolvedValue(9);

      await service.trackFingerprint('fp-ok', userId);

      expect(mockPrisma.userTrustProfile.upsert).not.toHaveBeenCalled();
    });
  });

  // ── checkTrustLevel ────────────────────────────────────────────────────

  describe('checkTrustLevel', () => {
    const userId = 'user-trust-test';

    it('should return allowed NORMAL when no trust profile exists', async () => {
      mockPrisma.userTrustProfile.findUnique.mockResolvedValue(null);

      const result = await service.checkTrustLevel(userId);

      expect(result).toEqual({ allowed: true, trustLevel: 'NORMAL' });
    });

    it('should pass through NORMAL trust level', async () => {
      mockPrisma.userTrustProfile.findUnique.mockResolvedValue({
        userId,
        trustLevel: 'NORMAL',
      });

      const result = await service.checkTrustLevel(userId);
      expect(result).toEqual({ allowed: true, trustLevel: 'NORMAL' });
    });

    it('should pass through TRUSTED level', async () => {
      mockPrisma.userTrustProfile.findUnique.mockResolvedValue({
        userId,
        trustLevel: 'TRUSTED',
      });

      const result = await service.checkTrustLevel(userId);
      expect(result).toEqual({ allowed: true, trustLevel: 'TRUSTED' });
    });

    it('should pass through FLAGGED level (warning but not blocked)', async () => {
      mockPrisma.userTrustProfile.findUnique.mockResolvedValue({
        userId,
        trustLevel: 'FLAGGED',
      });

      const result = await service.checkTrustLevel(userId);
      expect(result).toEqual({ allowed: true, trustLevel: 'FLAGGED' });
    });

    it('should block BANNED users', async () => {
      mockPrisma.userTrustProfile.findUnique.mockResolvedValue({
        userId,
        trustLevel: 'BANNED',
      });

      const result = await service.checkTrustLevel(userId);
      expect(result).toEqual({
        allowed: false,
        trustLevel: 'BANNED',
        message: 'Account restricted',
      });
    });

    it('should block RESTRICTED users with active restriction', async () => {
      const futureDate = new Date(Date.now() + 86_400_000); // 1 day from now
      mockPrisma.userTrustProfile.findUnique.mockResolvedValue({
        userId,
        trustLevel: 'RESTRICTED',
        restrictedUntil: futureDate,
      });

      const result = await service.checkTrustLevel(userId);
      expect(result).toEqual({
        allowed: false,
        trustLevel: 'RESTRICTED',
        message: expect.stringContaining('Restricted until'),
      });
    });

    it('should allow RESTRICTED users when restriction has expired', async () => {
      const pastDate = new Date(Date.now() - 86_400_000); // 1 day ago
      mockPrisma.userTrustProfile.findUnique.mockResolvedValue({
        userId,
        trustLevel: 'RESTRICTED',
        restrictedUntil: pastDate,
      });

      const result = await service.checkTrustLevel(userId);
      expect(result).toEqual({ allowed: true, trustLevel: 'RESTRICTED' });
    });

    it('should allow RESTRICTED users when restrictedUntil is null', async () => {
      mockPrisma.userTrustProfile.findUnique.mockResolvedValue({
        userId,
        trustLevel: 'RESTRICTED',
        restrictedUntil: null,
      });

      const result = await service.checkTrustLevel(userId);
      expect(result).toEqual({ allowed: true, trustLevel: 'RESTRICTED' });
    });

    it('should query the correct userId in the database', async () => {
      mockPrisma.userTrustProfile.findUnique.mockResolvedValue(null);

      await service.checkTrustLevel('specific-user');

      expect(mockPrisma.userTrustProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'specific-user' },
      });
    });
  });
});
