import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    
    if (redisUrl) {
      try {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          enableReadyCheck: false,
          retryStrategy: (times: number) => {
            if (times > 3) return null;
            return Math.min(times * 100, 3000);
          },
        });

        this.client.on('error', (err: Error) => {
          console.warn('Redis connection error:', err.message);
          this.isConnected = false;
        });

        this.client.on('connect', () => {
          this.isConnected = true;
          console.log('Redis connected');
        });

        this.client.connect().catch(() => {
          console.warn('Redis not available, running without caching');
          this.isConnected = false;
        });
      } catch (error) {
        console.warn('Failed to initialize Redis client');
        this.client = null;
      }
    } else {
      console.warn('REDIS_URL not configured, running without Redis');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.warn('Redis set error:', error);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      console.warn('Redis get error:', error);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(key);
    } catch (error) {
      console.warn('Redis del error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.warn('Redis exists error:', error);
      return false;
    }
  }

  async setLock(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.client || !this.isConnected) return true;
    try {
      const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
      console.warn('Redis setLock error:', error);
      return true;
    }
  }

  async releaseLock(key: string): Promise<void> {
    await this.del(key);
  }

  async incr(key: string): Promise<number> {
    if (!this.client || !this.isConnected) return 1;
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.warn('Redis incr error:', error);
      return 1;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.expire(key, ttlSeconds);
    } catch (error) {
      console.warn('Redis expire error:', error);
    }
  }
}
