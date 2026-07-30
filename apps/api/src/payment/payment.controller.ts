import { Controller, Post, Body } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ReservationService } from '../reservation/reservation.service';
import { prisma } from '@tatkal/database';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly reservationService: ReservationService,
  ) {}

  @Post('create')
  async createPayment(@Body() body: {
    reservationId: string;
    userId: string;
    amount: number;
    idempotencyKey: string;
  }) {
    const payment = await this.paymentService.createPayment(body);
    return { paymentId: payment.id, status: payment.status };
  }

  @Post('process')
  async processPayment(@Body() body: { paymentId: string }) {
    const success = await this.paymentService.processPayment(body.paymentId);

    // If payment succeeded, confirm reservation
    if (success) {
      const payment = await prisma.payment.findUnique({
        where: { id: body.paymentId },
      });
      if (payment) {
        await this.reservationService.confirmReservation(payment.reservationId);
      }
    }

    return { success };
  }

  @Post('webhook')
  async webhook(@Body() body: {
    providerPaymentId: string;
    status: 'succeeded' | 'failed';
    reservationId?: string;
  }) {
    const payment = await this.paymentService.handleWebhook(
      body.providerPaymentId,
      body.status,
    );

    if (body.status === 'succeeded' && body.reservationId) {
      await this.reservationService.confirmReservation(body.reservationId);
    }

    return { received: true };
  }
}
