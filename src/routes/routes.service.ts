import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

@Injectable()
export class RoutesService {
  private readonly CACHE_TTL = 300;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async create(dto: CreateRouteDto) {
    const route = await this.prisma.route.create({
      data: {
        name: dto.name,
        baseFare: dto.baseFare,
        isActive: dto.isActive ?? true,
      },
    });

    await this.invalidateCache();
    return route;
  }

  async findAll(includeInactive: boolean = false) {
    const cacheKey = `routes:all:${includeInactive}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const routes = await this.prisma.route.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        routeStations: {
          include: { station: true },
          orderBy: { stationOrder: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    await this.redisService.set(cacheKey, JSON.stringify(routes), this.CACHE_TTL);
    return routes;
  }

  async findById(id: string) {
    const cacheKey = `routes:${id}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const route = await this.prisma.route.findUnique({
      where: { id },
      include: {
        routeStations: {
          include: { station: true },
          orderBy: { stationOrder: 'asc' },
        },
      },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    await this.redisService.set(cacheKey, JSON.stringify(route), this.CACHE_TTL);
    return route;
  }

  async update(id: string, dto: UpdateRouteDto) {
    await this.findById(id);

    const route = await this.prisma.route.update({
      where: { id },
      data: dto,
      include: {
        routeStations: {
          include: { station: true },
          orderBy: { stationOrder: 'asc' },
        },
      },
    });

    await this.invalidateCache();
    return route;
  }

  async delete(id: string) {
    await this.findById(id);

    await this.prisma.route.delete({
      where: { id },
    });

    await this.invalidateCache();
    return { message: 'Route deleted successfully' };
  }

  async addStationToRoute(routeId: string, stationId: string, order: number) {
    await this.findById(routeId);

    const routeStation = await this.prisma.routeStation.create({
      data: {
        routeId,
        stationId,
        stationOrder: order,
      },
      include: { station: true },
    });

    await this.invalidateCache();
    return routeStation;
  }

  async removeStationFromRoute(routeId: string, stationId: string) {
    await this.prisma.routeStation.deleteMany({
      where: { routeId, stationId },
    });

    await this.invalidateCache();
    return { message: 'Station removed from route' };
  }

  private async invalidateCache() {
    await this.redisService.del('routes:all:true');
    await this.redisService.del('routes:all:false');
  }
}
