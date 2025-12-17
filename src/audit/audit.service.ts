import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditLogData {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData) {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        actorId: data.actorId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        before: data.before as any || null,
        after: data.after as any || null,
      },
    });

    return auditLog;
  }

  async getLogs(
    page: number = 1,
    limit: number = 50,
    filters?: {
      actorId?: string;
      action?: string;
      entity?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters) {
      if (filters.actorId) where.actorId = filters.actorId;
      if (filters.action) where.action = filters.action;
      if (filters.entity) where.entity = filters.entity;
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: { actor: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLogById(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: { actor: true },
    });
  }
}
