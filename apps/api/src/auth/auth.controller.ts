import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('verify')
  async verify(@Body() body: { phone: string }) {
    const result = await this.authService.verifyIdentity(body.phone);
    if (!result.verified) {
      return { verified: false, message: 'Invalid phone number' };
    }
    return {
      verified: true,
      sessionToken: result.sessionToken,
      message: 'Identity verified. You can now enter the queue.',
    };
  }

  @Get('check/:sessionToken')
  async check(@Param('sessionToken') sessionToken: string) {
    const verified = this.authService.isSessionVerified(sessionToken);
    return { verified };
  }
}
