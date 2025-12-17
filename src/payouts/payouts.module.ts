import { Module } from '@nestjs/common';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [PayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
