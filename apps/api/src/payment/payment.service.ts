import { Injectable } from '@nestjs/common';
import { prisma } from '@tatkal/database';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  /**
   * Create a payment with idempotency
   */
  async createPayment(params: {
    reservationId: string;
    userId: string;
    amount: number;
    idempotencyKey: string;
  }) {
    // Check idempotency
    const existing = await prisma.payment.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) return existing;

    return prisma.payment.create({
      data: {
        reservationId: params.reservationId,
        userId: params.userId,
        amount: params.amount,
        status: PaymentStatus.INITIATED,
        idempotencyKey: params.idempotencyKey,
      },
    });
  }

  /**
   * Process payment intent (simulates Stripe)
   */
  async processPayment(paymentId: string): Promise<boolean> {
    // Simulate payment processing
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return false;

    // Simulate 90% success rate
    const success = Math.random() < 0.9;

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: success ? PaymentStatus.CAPTURED : PaymentStatus.FAILED,
        providerPaymentId: `pi_sim_${Date.now()}`,
      },
    });

    return success;
  }

  /**
   * Handle Stripe webhook (async confirmation)
   */
  async handleWebhook(providerPaymentId: string, status: 'succeeded' | 'failed') {
    const payment = await prisma.payment.findFirst({
      where: { providerPaymentId },
    });
    if (!payment) throw new Error('Payment not found');

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: status === 'succeeded' ? PaymentStatus.CAPTURED : PaymentStatus.FAILED,
      },
    });

    return payment;
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string) {
    return prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED },
    });
  }
}
