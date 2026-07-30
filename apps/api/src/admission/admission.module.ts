import { Module } from '@nestjs/common';
import { AdmissionController } from './admission.controller';
import { AdmissionService } from './admission.service';
import { AdmissionGateway } from './admission.gateway';

@Module({
  controllers: [AdmissionController],
  providers: [AdmissionService, AdmissionGateway],
  exports: [AdmissionService],
})
export class AdmissionModule {}
