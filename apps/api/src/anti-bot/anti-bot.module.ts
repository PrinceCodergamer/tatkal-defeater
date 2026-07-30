import { Module } from '@nestjs/common';
import { AntibotController } from './anti-bot.controller';
import { AntibotService } from './anti-bot.service';

@Module({
  controllers: [AntibotController],
  providers: [AntibotService],
  exports: [AntibotService],
})
export class AntibotModule {}
