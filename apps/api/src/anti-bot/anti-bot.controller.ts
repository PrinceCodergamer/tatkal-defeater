import { Controller, Post, Body, Req } from '@nestjs/common';
import { AntibotService } from './anti-bot.service';
import { Request } from 'express';

@Controller('anti-bot')
export class AntibotController {
  constructor(private readonly antiBotService: AntibotService) {}

  @Post('check')
  async check(@Body() body: { deviceFingerprint: string; userId?: string }, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    const [rateLimit, trust] = await Promise.all([
      this.antiBotService.checkRateLimit(body.deviceFingerprint, ip),
      this.antiBotService.checkTrustLevel(body.userId || 'anonymous'),
    ]);

    return {
      allowed: rateLimit.allowed && trust.allowed,
      rateLimit,
      trust,
    };
  }

  @Post('fingerprint')
  async trackFingerprint(@Body() body: { userId: string; deviceFingerprint: string }) {
    await this.antiBotService.trackFingerprint(body.userId, body.deviceFingerprint);
    return { tracked: true };
  }
}
