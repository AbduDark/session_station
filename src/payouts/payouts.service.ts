import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestPayoutDto } from './dto/request-payout.dto';

@Injectable()
export class PayoutsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  async requestPayout(driverId: string, dto: RequestPayoutDto) {
    const session = await this.prisma.driverSession.findUnique({
      where: { id: dto.sessionId },
      include: {
        bookings: {
          where: { status: 'CONFIRMED' },
          include: { payment: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.driverId !== driverId) {
      throw new BadRequestException('Session does not belong to this driver');
    }

    if (session.status !== 'CLOSED' && session.status !== 'FULL') {
      throw new BadRequestException('Session must be closed or full to request payout');
    }

    const existingPayout = await this.prisma.driverPayout.findFirst({
      where: { sessionId: dto.sessionId },
    });

    if (existingPayout) {
      throw new BadRequestException('Payout already requested for this session');
    }

    let grossAmount = 0;
    let serviceFees = 0;

    for (const booking of session.bookings) {
      if (booking.payment && booking.payment.status === 'SUCCESS') {
        grossAmount += booking.payment.fareAmount;
        serviceFees += booking.payment.serviceFee;
      }
    }

    const netAmount = grossAmount;

    const payout = await this.prisma.driverPayout.create({
      data: {
        driverId,
        sessionId: dto.sessionId,
        grossAmount,
        serviceFees,
        netAmount,
        status: 'PENDING',
      },
      include: {
        driver: { include: { user: true } },
        session: { include: { route: true, station: true } },
      },
    });

    return payout;
  }

  async getDriverPayouts(driverId: string, status?: string) {
    const where: any = { driverId };
    if (status) where.status = status;

    const payouts = await this.prisma.driverPayout.findMany({
      where,
      include: {
        session: { include: { route: true, station: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payouts;
  }

  async getAllPayouts(status?: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [payouts, total] = await Promise.all([
      this.prisma.driverPayout.findMany({
        where,
        skip,
        take: limit,
        include: {
          driver: { include: { user: true } },
          session: { include: { route: true, station: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driverPayout.count({ where }),
    ]);

    return {
      payouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approvePayout(payoutId: string, adminId: string) {
    const payout = await this.prisma.driverPayout.findUnique({
      where: { id: payoutId },
      include: { driver: true },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'PENDING') {
      throw new BadRequestException('Payout is not pending');
    }

    const updatedPayout = await this.prisma.driverPayout.update({
      where: { id: payoutId },
      data: {
        status: 'APPROVED',
        approvedByAdmin: adminId,
      },
      include: {
        driver: { include: { user: true } },
        session: { include: { route: true, station: true } },
      },
    });

    await this.auditService.log({
      actorId: adminId,
      action: 'APPROVE_PAYOUT',
      entity: 'DriverPayout',
      entityId: payoutId,
      before: { status: 'PENDING' },
      after: { status: 'APPROVED' },
    });

    await this.notificationsService.createNotification(payout.driver.userId, {
      type: 'PAYOUT_APPROVED',
      payload: {
        payoutId: payout.id,
        amount: payout.netAmount,
      },
    });

    return updatedPayout;
  }

  async markPayoutAsPaid(payoutId: string, adminId: string) {
    const payout = await this.prisma.driverPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'APPROVED') {
      throw new BadRequestException('Payout must be approved before marking as paid');
    }

    const updatedPayout = await this.prisma.driverPayout.update({
      where: { id: payoutId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
      include: {
        driver: { include: { user: true } },
        session: { include: { route: true, station: true } },
      },
    });

    await this.auditService.log({
      actorId: adminId,
      action: 'MARK_PAYOUT_PAID',
      entity: 'DriverPayout',
      entityId: payoutId,
      before: { status: 'APPROVED' },
      after: { status: 'PAID', paidAt: updatedPayout.paidAt },
    });

    return updatedPayout;
  }

  async getPayoutById(payoutId: string) {
    const payout = await this.prisma.driverPayout.findUnique({
      where: { id: payoutId },
      include: {
        driver: { include: { user: true } },
        session: { include: { route: true, station: true } },
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return payout;
  }
}
