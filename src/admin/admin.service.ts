import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getFinanceReport(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalPayments,
      successfulPayments,
      totalServiceFees,
      totalPayouts,
      pendingPayouts,
    ] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({
        where: { ...where, status: 'SUCCESS' },
        _sum: { totalAmount: true, fareAmount: true, serviceFee: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: { ...where, status: 'SUCCESS' },
        _sum: { serviceFee: true },
      }),
      this.prisma.driverPayout.aggregate({
        where: { ...where, status: 'PAID' },
        _sum: { netAmount: true },
        _count: true,
      }),
      this.prisma.driverPayout.aggregate({
        where: { ...where, status: 'PENDING' },
        _sum: { netAmount: true },
        _count: true,
      }),
    ]);

    return {
      payments: {
        total: totalPayments,
        successful: successfulPayments._count,
        totalRevenue: successfulPayments._sum.totalAmount || 0,
        totalFares: successfulPayments._sum.fareAmount || 0,
        totalServiceFees: totalServiceFees._sum.serviceFee || 0,
      },
      payouts: {
        paid: {
          count: totalPayouts._count,
          amount: totalPayouts._sum.netAmount || 0,
        },
        pending: {
          count: pendingPayouts._count,
          amount: pendingPayouts._sum.netAmount || 0,
        },
      },
      platformRevenue: totalServiceFees._sum.serviceFee || 0,
    };
  }

  async getDashboardStats() {
    const [
      totalUsers,
      totalDrivers,
      totalPassengers,
      activeDrivers,
      pendingDrivers,
      activeSessions,
      totalBookings,
      confirmedBookings,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'DRIVER' } }),
      this.prisma.user.count({ where: { role: 'PASSENGER' } }),
      this.prisma.driverProfile.count({ where: { verificationStatus: 'APPROVED' } }),
      this.prisma.driverProfile.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.driverSession.count({ where: { status: 'ACTIVE' } }),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: 'CONFIRMED' } }),
    ]);

    return {
      users: {
        total: totalUsers,
        drivers: totalDrivers,
        passengers: totalPassengers,
      },
      drivers: {
        approved: activeDrivers,
        pending: pendingDrivers,
      },
      sessions: {
        active: activeSessions,
      },
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
      },
    };
  }

  async getRecentActivity(limit: number = 20) {
    const [recentBookings, recentPayments, recentSessions] = await Promise.all([
      this.prisma.booking.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          passenger: true,
          session: { include: { route: true } },
        },
      }),
      this.prisma.payment.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: { include: { passenger: true } },
        },
      }),
      this.prisma.driverSession.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          driver: { include: { user: true } },
          route: true,
          station: true,
        },
      }),
    ]);

    return {
      recentBookings,
      recentPayments,
      recentSessions,
    };
  }
}
