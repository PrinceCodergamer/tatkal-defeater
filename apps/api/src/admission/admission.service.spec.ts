import { Test, TestingModule } from '@nestjs/testing';
import { AdmissionService } from './admission.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import * as crypto from 'crypto';
import { prisma as _prisma } from '@tatkal/database';
const mockPrisma = _prisma as any;

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRedis = {
  zadd: jest.fn(),
  zrank: jest.fn(),
  zcard: jest.fn(),
  zrange: jest.fn(),
  zrem: jest.fn(),
};

// Mock external modules so tests don't need real Redis/DB connections.
jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    zadd: jest.fn(),
    zrank: jest.fn(),
    zcard: jest.fn(),
    zrange: jest.fn(),
    zrem: jest.fn(),
  })),
}));

jest.mock('@tatkal/database', () => ({
  prisma: {
    admissionToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    reservation: { create: jest.fn(), updateMany: jest.fn() },
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  },
}));

jest.mock('@prisma/client', () => ({
  TokenStatus: {
    WAITING: 'WAITING',
    ADMITTED: 'ADMITTED',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED',
  },
}));

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build an HMAC-signed token with the same algorithm the service uses. */
function buildSignedToken(userId: string, sessionId: string, timestamp?: number): string {
  const ts = timestamp ?? Date.now();
  const secret = process.env.HMAC_SECRET || 'tatkal-dev-secret-change-in-prod';
  const payload = `${userId}:${sessionId}:${ts}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64')}.${sig}`;
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('AdmissionService', () => {
  let service: AdmissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionService,
        {
          provide: REDIS_CLIENT,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<AdmissionService>(AdmissionService);
    jest.clearAllMocks();
  });

  // ── signToken ──────────────────────────────────────────────────────────

  describe('signToken', () => {
    it('should produce a token with base64-payload and HMAC signature separated by a dot', () => {
      const token = service.signToken('user-1', 'session-abc');
      expect(token).toContain('.');
      const [encodedPayload, sig] = token.split('.');
      // Payload must be valid base64
      const decoded = Buffer.from(encodedPayload, 'base64').toString();
      expect(decoded).toMatch(/^user-1:session-abc:\d+$/);
      // Signature must be a hex string (sha256 = 64 hex chars)
      expect(sig).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different tokens for different userIds', () => {
      // Use fixed timestamp so the payload differs only by userId
      jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      const token1 = service.signToken('user-a', 'sess-1');
      const token2 = service.signToken('user-b', 'sess-1');
      expect(token1).not.toBe(token2);
      jest.restoreAllMocks();
    });

    it('should produce different tokens for different sessionIds', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      const token1 = service.signToken('user-1', 'sess-a');
      const token2 = service.signToken('user-1', 'sess-b');
      expect(token1).not.toBe(token2);
      jest.restoreAllMocks();
    });
  });

  // ── verifyToken ────────────────────────────────────────────────────────

  describe('verifyToken', () => {
    it('should return userId and sessionId for a valid token', () => {
      const token = buildSignedToken('user-42', 'session-xyz', 5_000_000);
      const result = service.verifyToken(token);
      expect(result).toEqual({ userId: 'user-42', sessionId: 'session-xyz' });
    });

    it('should return null when the signature is invalid', () => {
      const [payload] = buildSignedToken('user-1', 'sess-1').split('.');
      const badToken = `${payload}.invalidsignature`;
      expect(service.verifyToken(badToken)).toBeNull();
    });

    it('should return null when the token has no dot separator', () => {
      expect(service.verifyToken('no-dot-here')).toBeNull();
    });

    it('should return null for garbled base64 payload', () => {
      const sig = 'a'.repeat(64);
      expect(service.verifyToken(`!!!not-base64!!!.${sig}`)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(service.verifyToken('')).toBeNull();
    });
  });

  // ── enterQueue ─────────────────────────────────────────────────────────

  describe('enterQueue', () => {
    const fakeTokenId = 'tok_001';
    const fakeSessionId = '550e8400-e29b-41d4-a716-446655440000';
    const fixedTimestamp = 1_000_000_000;

    beforeEach(() => {
      jest.spyOn(crypto, 'randomUUID').mockReturnValue(fakeSessionId);
      jest.spyOn(Date, 'now').mockReturnValue(fixedTimestamp);

      mockPrisma.admissionToken.create.mockResolvedValue({
        id: fakeTokenId,
        userId: 'u1',
        sessionId: fakeSessionId,
        token: expect.any(String),
        deviceFingerprint: 'fp-abc',
        status: 'WAITING',
        expiresAt: new Date(fixedTimestamp + 300_000),
      });

      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zrank.mockResolvedValue(0); // 0-indexed → position 1
      mockRedis.zcard.mockResolvedValue(5);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create an admission token in the database', async () => {
      await service.enterQueue('u1', 'fp-abc');
      expect(mockPrisma.admissionToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          deviceFingerprint: 'fp-abc',
          status: 'WAITING',
        }),
      });
    });

    it('should add the token to the Redis waiting queue', async () => {
      await service.enterQueue('u1', 'fp-abc');
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'queue:admission:waiting',
        fixedTimestamp,
        fakeTokenId,
      );
    });

    it('should return queue position and total waiting', async () => {
      const result = await service.enterQueue('u1', 'fp-abc');
      expect(result).toEqual({
        tokenId: fakeTokenId,
        signedToken: expect.stringMatching(/^.+\..{64}$/),
        position: 1,
        totalWaiting: 5,
      });
    });

    it('should handle null position from Redis (defensive)', async () => {
      mockRedis.zrank.mockResolvedValue(null);
      const result = await service.enterQueue('u1', 'fp-abc');
      expect(result.position).toBe(0);
    });
  });

  // ── getQueueStatus ─────────────────────────────────────────────────────

  describe('getQueueStatus', () => {
    it('should return position, total waiting, and status from DB', async () => {
      mockRedis.zrank.mockResolvedValue(2);
      mockRedis.zcard.mockResolvedValue(10);
      mockPrisma.admissionToken.findUnique.mockResolvedValue({
        id: 'tok-1',
        status: 'WAITING',
      });

      const result = await service.getQueueStatus('tok-1');
      expect(result).toEqual({
        position: 3, // 0-indexed + 1
        totalWaiting: 10,
        status: 'WAITING',
      });
    });

    it('should default to EXPIRED when token is not found in DB', async () => {
      mockRedis.zrank.mockResolvedValue(0);
      mockRedis.zcard.mockResolvedValue(1);
      mockPrisma.admissionToken.findUnique.mockResolvedValue(null);

      const result = await service.getQueueStatus('tok-missing');
      expect(result.status).toBe('EXPIRED');
    });

    it('should handle null rank (token not in queue yet)', async () => {
      mockRedis.zrank.mockResolvedValue(null);
      mockRedis.zcard.mockResolvedValue(20);
      mockPrisma.admissionToken.findUnique.mockResolvedValue({
        id: 'tok-1',
        status: 'WAITING',
      });

      const result = await service.getQueueStatus('tok-1');
      expect(result.position).toBe(0);
    });
  });

  // ── runLotteryDraw ─────────────────────────────────────────────────────

  describe('runLotteryDraw', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return an empty array when the waiting queue is empty', async () => {
      mockRedis.zrange.mockResolvedValue([]);
      const result = await service.runLotteryDraw(50);
      expect(result).toEqual([]);
    });

    it('should attempt to allocate seats for candidates and return admitted token IDs', async () => {
      const candidateIds = ['tok-a', 'tok-b', 'tok-c'];
      mockRedis.zrange.mockResolvedValue(candidateIds);
      // Deterministic shuffle — return the array in-order so mock implementations fire predictably
      jest.spyOn(service as any, 'cryptoShuffle').mockImplementation((arr: any) => arr);
      // Mock the private tryAllocateSeat via service internals
      jest.spyOn(service as any, 'tryAllocateSeat')
        .mockImplementationOnce(async (id: unknown) => id === 'tok-a')
        .mockImplementationOnce(async (id: unknown) => id === 'tok-b')
        .mockImplementationOnce(async (id: unknown) => false);

      const result = await service.runLotteryDraw(3);
      expect(result).toEqual(['tok-a', 'tok-b']);
    });

    it('should respect the batchSize parameter', async () => {
      const candidateIds = ['tok-1', 'tok-2', 'tok-3', 'tok-4', 'tok-5'];
      mockRedis.zrange.mockResolvedValue(candidateIds);
      jest.spyOn(service as any, 'cryptoShuffle').mockImplementation((arr: any) => arr);
      jest.spyOn(service as any, 'tryAllocateSeat').mockResolvedValue(false);

      await service.runLotteryDraw(3);
      // Fetches all candidates via zrange, but only processes up to batchSize
      expect(mockRedis.zrange).toHaveBeenCalledWith('queue:admission:waiting', 0, -1);
      expect((service as any).tryAllocateSeat).toHaveBeenCalledTimes(3);
    });
  });

  // ── tryAllocateSeat (private) ──────────────────────────────────────────

  describe('tryAllocateSeat', () => {
    const tokenId = 'tok-seat-test';

    beforeEach(() => {
      mockPrisma.admissionToken.findUnique.mockResolvedValue({
        id: tokenId,
        userId: 'u1',
        status: 'WAITING',
        deviceFingerprint: 'fp-123',
      });
    });

    it('should return false when token is not found', async () => {
      mockPrisma.admissionToken.findUnique.mockResolvedValue(null);
      const result = await (service as any).tryAllocateSeat(tokenId);
      expect(result).toBe(false);
    });

    it('should return false when token is not WAITING', async () => {
      mockPrisma.admissionToken.findUnique.mockResolvedValue({
        id: tokenId,
        status: 'ADMITTED',
      });
      const result = await (service as any).tryAllocateSeat(tokenId);
      expect(result).toBe(false);
    });

    it('should return false when no slot is available ($queryRawUnsafe returns empty)', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      const result = await (service as any).tryAllocateSeat(tokenId);
      expect(result).toBe(false);
    });

    it('should return false when optimistic update affects 0 rows', async () => {
      const slot = [{ id: 'slot-1', version: 1 }];
      mockPrisma.$queryRawUnsafe.mockResolvedValue(slot);
      mockPrisma.$executeRawUnsafe.mockResolvedValue(0); // No rows updated
      const result = await (service as any).tryAllocateSeat(tokenId);
      expect(result).toBe(false);
    });

    it('should mark token as ADMITTED and create a reservation on success', async () => {
      const slot = [{ id: 'slot-42', version: 5 }];
      mockPrisma.$queryRawUnsafe.mockResolvedValue(slot);
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1); // One row updated
      mockPrisma.admissionToken.update.mockResolvedValue({});
      mockRedis.zrem.mockResolvedValue(1);
      mockPrisma.reservation.create.mockResolvedValue({ id: 'res-1' });

      const result = await (service as any).tryAllocateSeat(tokenId);
      expect(result).toBe(true);

      // Token status updated
      expect(mockPrisma.admissionToken.update).toHaveBeenCalledWith({
        where: { id: tokenId },
        data: expect.objectContaining({
          status: 'ADMITTED',
          admittedAt: expect.any(Date),
        }),
      });

      // Removed from queue
      expect(mockRedis.zrem).toHaveBeenCalledWith('queue:admission:waiting', tokenId);

      // Reservation created
      expect(mockPrisma.reservation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          resourceId: 'slot-42',
          status: 'PENDING',
          idempotencyKey: `admit-${tokenId}`,
        }),
      });
    });
  });

  // ── releaseExpiredHolds ────────────────────────────────────────────────

  describe('releaseExpiredHolds', () => {
    it('should execute the inventory release query and mark expired reservations', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue(3);

      const result = await service.releaseExpiredHolds();
      expect(result).toBe(3);

      // Should update reservations with expired holds
      expect(mockPrisma.reservation.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          holdExpiresAt: { lt: expect.any(Date) },
        },
        data: { status: 'EXPIRED' },
      });
    });

    it('should return 0 when no holds have expired', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue(0);
      const result = await service.releaseExpiredHolds();
      expect(result).toBe(0);
    });
  });

  // ── Integration: signToken ↔ verifyToken ──────────────────────────────

  describe('signToken / verifyToken roundtrip', () => {
    it('should successfully verify a freshly signed token', () => {
      const token = service.signToken('roundtrip-user', 'roundtrip-session');
      const result = service.verifyToken(token);
      expect(result).toEqual({
        userId: 'roundtrip-user',
        sessionId: 'roundtrip-session',
      });
    });
  });
});
