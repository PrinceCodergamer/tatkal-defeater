import { Controller, Post, Get, Body, Param, Inject, Query } from '@nestjs/common';
import { AdmissionService } from './admission.service';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

@Controller('admission')
export class AdmissionController {
  constructor(
    private readonly admissionService: AdmissionService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Post('enter')
  async enterQueue(
    @Body() body: { userId: string; deviceFingerprint: string; identityVerified?: boolean },
  ) {
    // Device-level rate limiting
    const fpKey = `rate:fp:${body.deviceFingerprint}`;
    const count = await this.redis.incr(fpKey);
    if (count === 1) await this.redis.expire(fpKey, 60);
    if (count > 10) {
      return { error: 'Rate limited. Please wait before trying again.', retryAfterMs: 5000 };
    }

    const result = await this.admissionService.enterQueue(
      body.userId,
      body.deviceFingerprint,
    );

    return {
      ...result,
      estimatedWaitSeconds: Math.floor(result.position / 500) * 60,
    };
  }

  @Get('status/:tokenId')
  async getStatus(@Param('tokenId') tokenId: string) {
    return this.admissionService.getQueueStatus(tokenId);
  }

  @Post('lottery-tick')
  async lotteryTick(@Query('batchSize') batchSize?: string) {
    const size = batchSize ? parseInt(batchSize, 10) : 50;
    const admitted = await this.admissionService.runLotteryDraw(size);
    const totalWaiting = await this.redis.zcard('queue:admission:waiting');
    return { admitted, count: admitted.length, totalWaiting };
  }

  @Post('scramble')
  async scrambleQueue() {
    const scrambled = await this.admissionService.scrambleQueue();
    return { scrambled, message: `Queue re-shuffled: ${scrambled} positions randomized` };
  }

  @Post('release-expired')
  async releaseExpired() {
    const count = await this.admissionService.releaseExpiredHolds();
    return { released: count };
  }
}
