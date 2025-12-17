import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SessionsService } from '../sessions/sessions.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateHoldDto } from './dto/create-hold.dto';

@Injectable()
export class BookingsService {
  private readonly HOLD_TTL_SECONDS = 300;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private sessionsService: SessionsService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  async createHold(passengerId: string, dto: CreateHoldDto) {
    const lockKey = `seat:lock:${dto.sessionId}`;
    const lockAcquired = await this.redisService.setLock(lockKey, 10);

    if (!lockAcquired) {
      throw new BadRequestException('Session is busy, please try again');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const session = await tx.driverSession.findUnique({
          where: { id: dto.sessionId },
          include: { route: true },
        });

        if (!session) {
          throw new NotFoundException('Session not found');
        }

        if (session.status !== 'ACTIVE') {
          throw new BadRequestException('Session is not active');
        }

        if (session.availableSeats < dto.seatsCount) {
          throw new BadRequestException(
            `Only ${session.availableSeats} seats available`,
          );
        }

        const existingHold = await tx.seatHold.findFirst({
          where: {
            sessionId: dto.sessionId,
            passengerId,
            expiresAt: { gt: new Date() },
          },
        });

        if (existingHold) {
          throw new BadRequestException('You already have a pending hold for this session');
        }

        const expiresAt = new Date(Date.now() + this.HOLD_TTL_SECONDS * 1000);

        const hold = await tx.seatHold.create({
          data: {
            sessionId: dto.sessionId,
            passengerId,
            seatsCount: dto.seatsCount,
            expiresAt,
          },
        });

        await tx.driverSession.update({
          where: { id: dto.sessionId },
          data: {
            availableSeats: { decrement: dto.seatsCount },
            status: session.availableSeats - dto.seatsCount === 0 ? 'FULL' : 'ACTIVE',
          },
        });

        await this.redisService.set(
          `hold:${hold.id}`,
          JSON.stringify({ sessionId: dto.sessionId, seatsCount: dto.seatsCount }),
          this.HOLD_TTL_SECONDS,
        );

        const updatedSession = await tx.driverSession.findUnique({
          where: { id: dto.sessionId },
          include: {
            driver: { include: { user: true } },
            route: true,
            station: true,
          },
        });

        if (updatedSession) {
          this.realtimeGateway.emitSessionUpdate(updatedSession);
        }

        return {
          holdId: hold.id,
          sessionId: dto.sessionId,
          seatsCount: dto.seatsCount,
          farePerSeat: session.route.baseFare,
          serviceFee: 1,
          totalAmount: (session.route.baseFare + 1) * dto.seatsCount,
          expiresAt,
          expiresIn: this.HOLD_TTL_SECONDS,
        };
      });
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  async releaseHold(holdId: string) {
    const hold = await this.prisma.seatHold.findUnique({
      where: { id: holdId },
    });

    if (!hold) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.seatHold.delete({
        where: { id: holdId },
      });

      const session = await tx.driverSession.update({
        where: { id: hold.sessionId },
        data: {
          availableSeats: { increment: hold.seatsCount },
          status: 'ACTIVE',
        },
        include: {
          driver: { include: { user: true } },
          route: true,
          station: true,
        },
      });

      this.realtimeGateway.emitSeatReleased(session, hold.seatsCount);
    });

    await this.redisService.del(`hold:${holdId}`);
  }

  async convertHoldToBooking(holdId: string, passengerId: string) {
    const hold = await this.prisma.seatHold.findUnique({
      where: { id: holdId },
      include: { session: { include: { route: true } } },
    });

    if (!hold) {
      throw new NotFoundException('Hold not found or expired');
    }

    if (hold.passengerId !== passengerId) {
      throw new BadRequestException('Hold does not belong to this user');
    }

    if (hold.expiresAt < new Date()) {
      await this.releaseHold(holdId);
      throw new BadRequestException('Hold has expired');
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          sessionId: hold.sessionId,
          passengerId,
          seatsCount: hold.seatsCount,
          status: 'CONFIRMED',
        },
        include: {
          session: {
            include: {
              driver: { include: { user: true } },
              route: true,
              station: true,
            },
          },
        },
      });

      await tx.seatHold.delete({
        where: { id: holdId },
      });

      return newBooking;
    });

    await this.redisService.del(`hold:${holdId}`);

    this.realtimeGateway.emitSeatBooked(booking.session, booking.seatsCount);

    return booking;
  }

  async getPassengerBookings(passengerId: string, status?: string) {
    const where: any = { passengerId };
    if (status) where.status = status;

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        session: {
          include: {
            driver: { include: { user: true } },
            route: true,
            station: true,
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings;
  }

  async getBookingById(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        session: {
          include: {
            driver: { include: { user: true } },
            route: true,
            station: true,
          },
        },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async cancelBooking(bookingId: string, passengerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { session: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.passengerId !== passengerId) {
      throw new BadRequestException('Booking does not belong to this user');
    }

    if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') {
      throw new BadRequestException('Cannot cancel this booking');
    }

    const updatedBooking = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      await tx.driverSession.update({
        where: { id: booking.sessionId },
        data: {
          availableSeats: { increment: booking.seatsCount },
          status: 'ACTIVE',
        },
      });

      return cancelled;
    });

    const session = await this.sessionsService.getSessionById(booking.sessionId);
    this.realtimeGateway.emitSeatReleased(session, booking.seatsCount);

    return updatedBooking;
  }

  async cleanupExpiredHolds() {
    const expiredHolds = await this.prisma.seatHold.findMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    for (const hold of expiredHolds) {
      await this.releaseHold(hold.id);
    }

    return { cleaned: expiredHolds.length };
  }
}
