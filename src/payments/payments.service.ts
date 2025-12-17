import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BookingsService } from '../bookings/bookings.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly SERVICE_FEE = 1;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private bookingsService: BookingsService,
    private realtimeGateway: RealtimeGateway,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  async processPayment(passengerId: string, dto: ProcessPaymentDto) {
    const idempotencyKey = dto.idempotencyKey;
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
      include: { booking: true },
    });

    if (existingPayment) {
      return existingPayment;
    }

    const hold = await this.prisma.seatHold.findUnique({
      where: { id: dto.holdId },
      include: { session: { include: { route: true } } },
    });

    if (!hold) {
      throw new NotFoundException('Hold not found or expired');
    }

    if (hold.passengerId !== passengerId) {
      throw new BadRequestException('Hold does not belong to this user');
    }

    if (hold.expiresAt < new Date()) {
      await this.bookingsService.releaseHold(dto.holdId);
      throw new BadRequestException('Hold has expired');
    }

    const fareAmount = hold.session.route.baseFare * hold.seatsCount;
    const totalAmount = fareAmount + (this.SERVICE_FEE * hold.seatsCount);

    const payment = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          sessionId: hold.sessionId,
          passengerId,
          seatsCount: hold.seatsCount,
          status: 'CONFIRMED',
        },
      });

      const newPayment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          fareAmount,
          serviceFee: this.SERVICE_FEE * hold.seatsCount,
          totalAmount,
          method: (dto.method as any) || 'CASH',
          status: 'SUCCESS',
          idempotencyKey,
          gatewayReference: dto.gatewayReference,
        },
        include: {
          booking: {
            include: {
              session: {
                include: {
                  driver: { include: { user: true } },
                  route: true,
                  station: true,
                },
              },
            },
          },
        },
      });

      await tx.seatHold.delete({
        where: { id: dto.holdId },
      });

      return newPayment;
    });

    await this.redisService.del(`hold:${dto.holdId}`);

    await this.auditService.log({
      actorId: passengerId,
      action: 'PAYMENT_SUCCESS',
      entity: 'Payment',
      entityId: payment.id,
      after: {
        bookingId: payment.bookingId,
        totalAmount: payment.totalAmount,
        method: payment.method,
      },
    });

    await this.notificationsService.createNotification(passengerId, {
      type: 'PAYMENT_SUCCESS',
      payload: {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        amount: payment.totalAmount,
      },
    });

    this.realtimeGateway.emitPaymentSuccess(payment);

    return payment;
  }

  async getPaymentById(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            session: {
              include: {
                driver: { include: { user: true } },
                route: true,
                station: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getPassengerPayments(passengerId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        booking: { passengerId },
      },
      include: {
        booking: {
          include: {
            session: {
              include: { route: true, station: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments;
  }

  async refundPayment(paymentId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: { include: { session: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'SUCCESS') {
      throw new BadRequestException('Can only refund successful payments');
    }

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const refunded = await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'REFUNDED' },
      });

      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CANCELLED' },
      });

      await tx.driverSession.update({
        where: { id: payment.booking.sessionId },
        data: {
          availableSeats: { increment: payment.booking.seatsCount },
          status: 'ACTIVE',
        },
      });

      return refunded;
    });

    await this.auditService.log({
      actorId: adminId,
      action: 'PAYMENT_REFUNDED',
      entity: 'Payment',
      entityId: paymentId,
      before: { status: 'SUCCESS' },
      after: { status: 'REFUNDED' },
    });

    return updatedPayment;
  }
}
