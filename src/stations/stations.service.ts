import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';

@Injectable()
export class StationsService {
  private readonly CACHE_TTL = 300;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async create(dto: CreateStationDto) {
    const station = await this.prisma.station.create({
      data: {
        name: dto.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isActive: dto.isActive ?? true,
      },
    });

    await this.invalidateCache();
    return station;
  }

  async findAll(includeInactive: boolean = false) {
    const cacheKey = `stations:all:${includeInactive}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const stations = await this.prisma.station.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });

    await this.redisService.set(cacheKey, JSON.stringify(stations), this.CACHE_TTL);
    return stations;
  }

  async findById(id: string) {
    const cacheKey = `stations:${id}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const station = await this.prisma.station.findUnique({
      where: { id },
      include: {
        routeStations: {
          include: { route: true },
        },
      },
    });

    if (!station) {
      throw new NotFoundException('Station not found');
    }

    await this.redisService.set(cacheKey, JSON.stringify(station), this.CACHE_TTL);
    return station;
  }

  async update(id: string, dto: UpdateStationDto) {
    await this.findById(id);

    const station = await this.prisma.station.update({
      where: { id },
      data: dto,
    });

    await this.invalidateCache();
    return station;
  }

  async delete(id: string) {
    await this.findById(id);

    await this.prisma.station.delete({
      where: { id },
    });

    await this.invalidateCache();
    return { message: 'Station deleted successfully' };
  }

  private async invalidateCache() {
    await this.redisService.del('stations:all:true');
    await this.redisService.del('stations:all:false');
  }
}
