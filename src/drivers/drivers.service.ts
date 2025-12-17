import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findById(driverId: string) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: { user: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  async findByUserId(userId: string) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    return driver;
  }

  async updateDriver(driverId: string, dto: UpdateDriverDto) {
    const driver = await this.prisma.driverProfile.update({
      where: { id: driverId },
      data: dto,
      include: { user: true },
    });

    return driver;
  }

  async approveDriver(driverId: string, adminId: string) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.verificationStatus === 'APPROVED') {
      throw new BadRequestException('Driver already approved');
    }

    const updatedDriver = await this.prisma.driverProfile.update({
      where: { id: driverId },
      data: { verificationStatus: 'APPROVED' },
      include: { user: true },
    });

    await this.auditService.log({
      actorId: adminId,
      action: 'APPROVE_DRIVER',
      entity: 'DriverProfile',
      entityId: driverId,
      before: { verificationStatus: driver.verificationStatus },
      after: { verificationStatus: 'APPROVED' },
    });

    return updatedDriver;
  }

  async rejectDriver(driverId: string, adminId: string, reason?: string) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const updatedDriver = await this.prisma.driverProfile.update({
      where: { id: driverId },
      data: { verificationStatus: 'REJECTED' },
      include: { user: true },
    });

    await this.auditService.log({
      actorId: adminId,
      action: 'REJECT_DRIVER',
      entity: 'DriverProfile',
      entityId: driverId,
      before: { verificationStatus: driver.verificationStatus },
      after: { verificationStatus: 'REJECTED', reason },
    });

    return updatedDriver;
  }

  async getPendingDrivers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [drivers, total] = await Promise.all([
      this.prisma.driverProfile.findMany({
        where: { verificationStatus: 'PENDING' },
        skip,
        take: limit,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driverProfile.count({
        where: { verificationStatus: 'PENDING' },
      }),
    ]);

    return {
      drivers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllDrivers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [drivers, total] = await Promise.all([
      this.prisma.driverProfile.findMany({
        skip,
        take: limit,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driverProfile.count(),
    ]);

    return {
      drivers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
