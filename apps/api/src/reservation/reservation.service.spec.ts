import { Test, TestingModule } from '@nestjs/testing';
import { ReservationService } from './reservation.service';
import { prisma as _prisma } from '@tatkal/database';
const mockPrisma = _prisma as any;

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@tatkal/database', () => ({
  prisma: {
    reservation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  },
}));

// ── Suite ──────────────────────────────────────────────────────────────────

describe('ReservationService', () => {
  let service: ReservationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReservationService],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
    jest.clearAllMocks();
  });

  // ── allocateSeat ───────────────────────────────────────────────────────

  describe('allocateSeat', () => {
    const slotId = 'slot-train-123';
    const userId = 'user-42';
    const quantity = 1;

    it('should allocate a seat and return slot info on success', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          id: slotId,
          availableCapacity: 4,
          version: 2,
          holdExpiresAt: new Date('2026-07-30T12:00:00Z'),
        },
      ]);

      const result = await service.allocateSeat(slotId, userId, quantity);

      expect(result).toEqual({
        slotId,
        availableCapacity: 4,
        version: 2,
        holdExpiresAt: expect.any(Date),
      });

      // Verify SQL was called with quantity and slotId params
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "InventorySlot"'),
        quantity,
        slotId,
      );
    });

    it('should throw SeatNotAvailableException when no capacity', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await expect(
        service.allocateSeat(slotId, userId, quantity),
      ).rejects.toThrow('Seat not available');
    });

    it('should throw SeatNotAvailableException when result is null', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue(null);

      await expect(
        service.allocateSeat(slotId, userId, quantity),
      ).rejects.toThrow('Seat not available');
    });

    it('should require available_capacity >= quantity', async () => {
      // The SQL WHERE clause requires available_capacity >= $1
      // If it fails, no rows are returned and the exception is thrown
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await expect(
        service.allocateSeat(slotId, userId, 999),
      ).rejects.toThrow('Seat not available');

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('"availableCapacity" >= $1'),
        999,
        slotId,
      );
    });

    it('should include optimistic locking condition in SQL', async () => {
      // The raw SQL should check holdExpiresAt for stale holds
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { id: slotId, availableCapacity: 5, version: 1, holdExpiresAt: null },
      ]);

      await service.allocateSeat(slotId, userId, quantity);

      const sql = (mockPrisma.$queryRawUnsafe as jest.Mock).mock.calls[0][0];
      expect(sql).toContain('"holdExpiresAt" IS NULL OR "holdExpiresAt" < NOW()');
    });
  });

  // ── createReservation ──────────────────────────────────────────────────

  describe('createReservation', () => {
    const params = {
      userId: 'user-1',
      slotId: 'slot-1',
      quantity: 2,
      totalPrice: 3000,
      idempotencyKey: 'idem-abc-123',
      deviceFingerprint: 'fp-xyz',
    };

    it('should create a new reservation record', async () => {
      const created = {
        id: 'res-1',
        ...params,
        resourceId: params.slotId,
        status: 'PENDING',
        holdExpiresAt: expect.any(Date),
      };
      mockPrisma.reservation.findUnique.mockResolvedValue(null);
      mockPrisma.reservation.create.mockResolvedValue(created);

      const result = await service.createReservation(params);

      expect(result).toEqual(created);
      expect(mockPrisma.reservation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          resourceId: 'slot-1',
          status: 'PENDING',
          quantity: 2,
          totalPrice: 3000,
          idempotencyKey: 'idem-abc-123',
          deviceFingerprint: 'fp-xyz',
        }),
      });
    });

    it('should return the existing reservation on idempotent call', async () => {
      const existing = {
        id: 'res-existing',
        userId: 'user-1',
        slotId: 'slot-1',
        status: 'PENDING',
        idempotencyKey: 'idem-abc-123',
      };
      mockPrisma.reservation.findUnique.mockResolvedValue(existing);

      const result = await service.createReservation(params);

      expect(result).toEqual(existing);
      expect(mockPrisma.reservation.create).not.toHaveBeenCalled();
    });

    it('should create a reservation without deviceFingerprint when omitted', async () => {
      const minimalParams = {
        userId: 'user-2',
        slotId: 'slot-2',
        quantity: 1,
        totalPrice: 1500,
        idempotencyKey: 'idem-minimal',
      };

      mockPrisma.reservation.findUnique.mockResolvedValue(null);
      mockPrisma.reservation.create.mockResolvedValue({ id: 'res-2', ...minimalParams });

      await service.createReservation(minimalParams);

      // deviceFingerprint field is passed as undefined (Prisma omits undefined fields)
      const createCallData = (mockPrisma.reservation.create as jest.Mock).mock.calls[0][0].data;
      expect(createCallData.deviceFingerprint).toBeUndefined();
    });
  });

  // ── confirmReservation ─────────────────────────────────────────────────

  describe('confirmReservation', () => {
    it('should update reservation status to CONFIRMED', async () => {
      const updated = {
        id: 'res-1',
        status: 'CONFIRMED',
        confirmedAt: expect.any(Date),
        holdExpiresAt: null,
      };
      mockPrisma.reservation.update.mockResolvedValue(updated);

      const result = await service.confirmReservation('res-1');

      expect(result).toEqual(updated);
      expect(mockPrisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: expect.objectContaining({
          status: 'CONFIRMED',
          confirmedAt: expect.any(Date),
          holdExpiresAt: null,
        }),
      });
    });
  });

  // ── cancelReservation ──────────────────────────────────────────────────

  describe('cancelReservation', () => {
    it('should release inventory and mark reservation as CANCELLED', async () => {
      const reservation = {
        id: 'res-cancel',
        userId: 'u1',
        slotId: 'slot-1',
        quantity: 2,
        status: 'PENDING',
      };
      mockPrisma.reservation.findUnique.mockResolvedValue(reservation);
      mockPrisma.$executeRawUnsafe.mockResolvedValue(1);
      mockPrisma.reservation.update.mockResolvedValue({
        ...reservation,
        status: 'CANCELLED',
        cancelledAt: expect.any(Date),
      });

      const result = await service.cancelReservation('res-cancel');

      expect(result.status).toBe('CANCELLED');
      // Inventory released with correct quantity
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "InventorySlot"'),
        reservation.quantity,
        reservation.slotId,
      );
    });

    it('should throw when reservation is not found', async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(null);

      await expect(service.cancelReservation('res-missing')).rejects.toThrow(
        'Reservation not found',
      );
    });
  });

  // ── findByIdempotencyKey ───────────────────────────────────────────────

  describe('findByIdempotencyKey', () => {
    it('should return the matching reservation', async () => {
      const reservation = { id: 'res-1', idempotencyKey: 'key-1' };
      mockPrisma.reservation.findUnique.mockResolvedValue(reservation);

      const result = await service.findByIdempotencyKey('key-1');
      expect(result).toEqual(reservation);
      expect(mockPrisma.reservation.findUnique).toHaveBeenCalledWith({
        where: { idempotencyKey: 'key-1' },
      });
    });

    it('should return null when no reservation exists for the key', async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue(null);
      const result = await service.findByIdempotencyKey('non-existent');
      expect(result).toBeNull();
    });
  });
});
