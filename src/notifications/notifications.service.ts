import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(userId: string, dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: dto.type as any,
        payload: dto.payload,
      },
    });

    return notification;
  }

  async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return notifications;
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: { isRead: true },
    });

    return notification;
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { marked: result.count };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { count };
  }
}
