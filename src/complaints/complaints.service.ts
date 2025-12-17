import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateComplaintDto) {
    const complaint = await this.prisma.complaint.create({
      data: {
        userId,
        bookingId: dto.bookingId,
        message: dto.message,
        status: 'OPEN' as any,
      },
      include: {
        user: true,
        booking: {
          include: {
            session: { include: { driver: { include: { user: true } } } },
          },
        },
      },
    });

    return complaint;
  }

  async getUserComplaints(userId: string) {
    const complaints = await this.prisma.complaint.findMany({
      where: { userId },
      include: {
        booking: {
          include: {
            session: { include: { route: true, station: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return complaints;
  }

  async getAllComplaints(status?: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [complaints, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: true,
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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return {
      complaints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getComplaintById(id: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        user: true,
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

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    return complaint;
  }

  async updateComplaint(id: string, dto: UpdateComplaintDto) {
    await this.getComplaintById(id);

    const complaint = await this.prisma.complaint.update({
      where: { id },
      data: dto as any,
      include: {
        user: true,
        booking: true,
      },
    });

    return complaint;
  }
}
