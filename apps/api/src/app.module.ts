import { Module } from '@nestjs/common';
import { AdmissionModule } from './admission/admission.module';
import { ReservationModule } from './reservation/reservation.module';
import { PaymentModule } from './payment/payment.module';
import { AuthModule } from './auth/auth.module';
import { AntibotModule } from './anti-bot/anti-bot.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    RedisModule,
    AdmissionModule,
    ReservationModule,
    PaymentModule,
    AuthModule,
    AntibotModule,
    FeatureFlagsModule,
  ],
})
export class AppModule {}
