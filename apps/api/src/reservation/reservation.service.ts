import { Injectable } from '@nestjs/common';
import { prisma } from '@tatkal/database';
import { SeatNotAvailableException } from '@tatkal/shared';

@Injectable()
export class ReservationService {
  /**
   * ATOMIC ALLOCATION — the single most important function in the system.
   * Uses PostgreSQL optimistic concurrency to prevent double bookings.
   * No read-then-write race condition. No application-level locks.
   */
  async allocateSeat(slotId: string, userId: string, quantity: number): Promise<{
    slotId: string;
    availableCapacity: number;
    version: number;
    holdExpiresAt: Date;
  }> {
    const result = await prisma.$queryRawUnsafe<Array<{
      id: string;
      "availableCapacity": number;
      version: number;
      "holdExpiresAt": Date;
    }>>(`
      UPDATE "InventorySlot"
      SET "availableCapacity" = "availableCapacity" - $1,
          version = version + 1,
          "holdExpiresAt" = NOW() + INTERVAL '5 minutes'
      WHERE id = $2
        AND "availableCapacity" >= $1
        AND ("holdExpiresAt" IS NULL OR "holdExpiresAt" < NOW())
      RETURNING id, "availableCapacity", version, "holdExpiresAt"
    `, quantity, slotId);

    if (!result || result.length === 0) {
      throw new SeatNotAvailableException();
    }

    return {
      slotId: result[0].id,
      availableCapacity: Number(result[0]["availableCapacity"]),
      version: result[0].version,
      holdExpiresAt: result[0]["holdExpiresAt"],
    };
  }

  /**
   * Create a reservation record
   */
  async createReservation(params: {
    userId: string;
    slotId: string;
    quantity: number;
    totalPrice: number;
    idempotencyKey: string;
    deviceFingerprint?: string;
  }) {
    // Check idempotency
    const existing = await prisma.reservation.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) return existing;

    return prisma.reservation.create({
      data: {
        userId: params.userId,
        resourceId: params.slotId,
        slotId: params.slotId,
        status: 'PENDING',
        holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        quantity: params.quantity,
        totalPrice: params.totalPrice,
        idempotencyKey: params.idempotencyKey,
        deviceFingerprint: params.deviceFingerprint,
      },
    });
  }

  /**
   * Confirm reservation after successful payment
   */
  async confirmReservation(reservationId: string) {
    return prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        holdExpiresAt: null,
      },
    });
  }

  /**
   * Cancel reservation and release inventory
   */
  async cancelReservation(reservationId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) throw new Error('Reservation not found');

    // Release inventory atomically
    await prisma.$executeRawUnsafe(`
      UPDATE "InventorySlot"
      SET "availableCapacity" = "availableCapacity" + $1,
          version = version + 1,
          "holdExpiresAt" = NULL
      WHERE id = $2
        AND "holdExpiresAt" IS NOT NULL
    `, reservation.quantity, reservation.slotId);

    return prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }

  /**
   * Get reservation by idempotency key
   */
  async findByIdempotencyKey(key: string) {
    return prisma.reservation.findUnique({
      where: { idempotencyKey: key },
    });
  }
}
