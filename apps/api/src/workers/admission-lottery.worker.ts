import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { AdmissionService } from '../admission/admission.service';

/**
 * Runs the admission lottery every 100ms.
 * This is the core fairness mechanism — random selection admitted at a controlled rate.
 */
@Injectable()
export class AdmissionLotteryWorker implements OnModuleInit {
  private readonly ADMISSION_RATE = parseInt(process.env.ADMISSION_RATE || '500');

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly admissionService: AdmissionService,
  ) {}

  onModuleInit() {
    this.startLottery();
  }

  private startLottery() {
    const tickMs = 100; // 10 draws per second
    const admitsPerTick = Math.floor(this.ADMISSION_RATE / (1000 / tickMs));

    console.log(`🎲 Admission lottery started: ${this.ADMISSION_RATE}/sec (${admitsPerTick} per ${tickMs}ms tick)`);

    setInterval(async () => {
      try {
        const admitted = await this.admissionService.runLotteryDraw(admitsPerTick);
        if (admitted.length > 0) {
          console.log(`🎲 Admitted ${admitted.length} users`);
        }
      } catch (err) {
        console.error('Lottery error:', err);
      }
    }, tickMs);
  }
}
