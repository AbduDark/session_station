import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DriversModule } from './drivers/drivers.module';
import { RoutesModule } from './routes/routes.module';
import { StationsModule } from './stations/stations.module';
import { SessionsModule } from './sessions/sessions.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { PayoutsModule } from './payouts/payouts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    DriversModule,
    RoutesModule,
    StationsModule,
    SessionsModule,
    BookingsModule,
    PaymentsModule,
    PayoutsModule,
    NotificationsModule,
    ComplaintsModule,
    AdminModule,
    AuditModule,
    RealtimeModule,
  ],
})
export class AppModule {}
