import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { BookingsModule } from '../bookings/bookings.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    forwardRef(() => BookingsModule),
    RealtimeModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
