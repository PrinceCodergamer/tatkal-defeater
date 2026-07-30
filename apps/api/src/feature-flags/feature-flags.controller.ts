import { Controller, Get, Post, Body, Param, ParseBoolPipe } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlag } from '@tatkal/shared';

@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly flags: FeatureFlagsService) {}

  @Get()
  async getAll() {
    return this.flags.getAllFlags();
  }

  @Get('defaults')
  getDefaults() {
    return this.flags.getDefaults();
  }

  @Get(':flag')
  async getOne(@Param('flag') flag: FeatureFlag) {
    const enabled = await this.flags.isEnabled(flag);
    return { flag, enabled };
  }

  @Post(':flag')
  async setOne(
    @Param('flag') flag: FeatureFlag,
    @Body('enabled', ParseBoolPipe) enabled: boolean,
  ) {
    await this.flags.setEnabled(flag as FeatureFlag, enabled);
    return { flag, enabled };
  }

  @Post('reset')
  async reset() {
    await this.flags.resetAll();
    return { reset: true };
  }
}
