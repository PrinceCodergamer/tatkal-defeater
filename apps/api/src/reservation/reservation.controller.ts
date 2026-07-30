import { Controller, Post, Body } from '@nestjs/common';
import { ReservationService } from './reservation.service';

@Controller('reservation')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post('allocate')
  async allocate(@Body() body: {
    slotId: string;
    userId: string;
    quantity: number;
    idempotencyKey: string;
    deviceFingerprint?: string;
  }) {
    const slot = await this.reservationService.allocateSeat(
      body.slotId,
      body.userId,
      body.quantity,
    );

    const reservation = await this.reservationService.createReservation({
      userId: body.userId,
      slotId: body.slotId,
      quantity: body.quantity,
      totalPrice: slot.availableCapacity > 0 ? 1500 * body.quantity : 1500 * body.quantity,
      idempotencyKey: body.idempotencyKey,
      deviceFingerprint: body.deviceFingerprint,
    });

    return {
      reservationId: reservation.id,
      status: reservation.status,
      holdExpiresAt: reservation.holdExpiresAt?.toISOString(),
    };
  }

  @Post('confirm')
  async confirm(@Body() body: { reservationId: string }) {
    const reservation = await this.reservationService.confirmReservation(
      body.reservationId,
    );
    return { status: reservation.status, confirmedAt: reservation.confirmedAt };
  }

  @Post('cancel')
  async cancel(@Body() body: { reservationId: string }) {
    const reservation = await this.reservationService.cancelReservation(
      body.reservationId,
    );
    return { status: reservation.status };
  }
}
