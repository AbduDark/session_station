import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { SessionsModule } from '../sessions/sessions.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [SessionsModule, RealtimeModule, AuditModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
