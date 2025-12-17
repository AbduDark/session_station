import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { StartSessionDto } from './dto/start-session.dto';

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  async startSession(driverId: string, dto: StartSessionDto) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    if (driver.verificationStatus !== 'APPROVED') {
      throw new ForbiddenException('Driver not approved');
    }

    const activeSession = await this.prisma.driverSession.findFirst({
      where: {
        driverId,
        status: { in: ['ACTIVE', 'FULL'] },
      },
    });

    if (activeSession) {
      throw new BadRequestException('Driver already has an active session');
    }

    const route = await this.prisma.route.findUnique({
      where: { id: dto.routeId },
    });

    if (!route || !route.isActive) {
      throw new NotFoundException('Route not found or inactive');
    }

    const station = await this.prisma.station.findUnique({
      where: { id: dto.stationId },
    });

    if (!station || !station.isActive) {
      throw new NotFoundException('Station not found or inactive');
    }

    const totalSeats = dto.totalSeats || driver.totalSeats;

    const session = await this.prisma.driverSession.create({
      data: {
        driverId,
        routeId: dto.routeId,
        stationId: dto.stationId,
        totalSeats,
        availableSeats: totalSeats,
        status: 'ACTIVE',
      },
      include: {
        driver: { include: { user: true } },
        route: true,
        station: true,
      },
    });

    this.realtimeGateway.emitSessionUpdate(session);

    return session;
  }

  async closeSession(sessionId: string, driverId: string) {
    const session = await this.prisma.driverSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.driverId !== driverId) {
      throw new ForbiddenException('Not authorized to close this session');
    }

    if (session.status === 'CLOSED' || session.status === 'CANCELLED') {
      throw new BadRequestException('Session already closed');
    }

    const updatedSession = await this.prisma.driverSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        endedAt: new Date(),
      },
      include: {
        driver: { include: { user: true } },
        route: true,
        station: true,
      },
    });

    this.realtimeGateway.emitSessionUpdate(updatedSession);

    return updatedSession;
  }

  async cancelSession(sessionId: string, driverId: string) {
    const session = await this.prisma.driverSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.driverId !== driverId) {
      throw new ForbiddenException('Not authorized to cancel this session');
    }

    if (session.status !== 'ACTIVE') {
      throw new BadRequestException('Can only cancel active sessions');
    }

    const confirmedBookings = await this.prisma.booking.count({
      where: {
        sessionId,
        status: 'CONFIRMED',
      },
    });

    if (confirmedBookings > 0) {
      throw new BadRequestException('Cannot cancel session with confirmed bookings');
    }

    const updatedSession = await this.prisma.driverSession.update({
      where: { id: sessionId },
      data: {
        status: 'CANCELLED',
        endedAt: new Date(),
      },
      include: {
        driver: { include: { user: true } },
        route: true,
        station: true,
      },
    });

    await this.prisma.seatHold.deleteMany({
      where: { sessionId },
    });

    this.realtimeGateway.emitSessionUpdate(updatedSession);

    return updatedSession;
  }

  async getActiveSessions(routeId?: string, stationId?: string) {
    const where: any = {
      status: 'ACTIVE',
    };

    if (routeId) where.routeId = routeId;
    if (stationId) where.stationId = stationId;

    const sessions = await this.prisma.driverSession.findMany({
      where,
      include: {
        driver: { include: { user: true } },
        route: true,
        station: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    return sessions;
  }

  async getSessionById(sessionId: string) {
    const session = await this.prisma.driverSession.findUnique({
      where: { id: sessionId },
      include: {
        driver: { include: { user: true } },
        route: true,
        station: true,
        bookings: {
          where: { status: 'CONFIRMED' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async getDriverSessions(driverId: string, status?: string) {
    const where: any = { driverId };
    if (status) where.status = status;

    const sessions = await this.prisma.driverSession.findMany({
      where,
      include: {
        route: true,
        station: true,
        bookings: {
          where: { status: 'CONFIRMED' },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    return sessions;
  }

  async updateSessionSeats(sessionId: string, seatsDelta: number) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.driverSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      const newAvailableSeats = session.availableSeats + seatsDelta;

      if (newAvailableSeats < 0) {
        throw new BadRequestException('Not enough available seats');
      }

      const newStatus = newAvailableSeats === 0 ? 'FULL' : 
                        session.status === 'FULL' && newAvailableSeats > 0 ? 'ACTIVE' : 
                        session.status;

      const updatedSession = await tx.driverSession.update({
        where: { id: sessionId },
        data: {
          availableSeats: newAvailableSeats,
          status: newStatus,
        },
        include: {
          driver: { include: { user: true } },
          route: true,
          station: true,
        },
      });

      return updatedSession;
    });
  }
}
