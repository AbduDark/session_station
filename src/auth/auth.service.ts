import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    const rateLimitKey = `otp:ratelimit:${dto.phone}`;
    const attempts = await this.redisService.incr(rateLimitKey);
    
    if (attempts === 1) {
      await this.redisService.expire(rateLimitKey, 60);
    }
    
    if (attempts > 3) {
      throw new BadRequestException('Too many OTP requests. Please try again later.');
    }

    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          role: (dto.role as any) || 'PASSENGER',
        },
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.otpCode.create({
      data: {
        userId: user.id,
        code: otpCode,
        expiresAt,
      },
    });

    console.log(`OTP for ${dto.phone}: ${otpCode}`);

    return {
      message: 'OTP sent successfully',
      expiresIn: 300,
      otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { driverProfile: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        code: dto.code,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.$transaction([
      this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      }),
    ]);

    const tokens = await this.generateTokens(user.id, user.role);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        isVerified: true,
        driverProfile: user.driverProfile,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const refreshTokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!refreshTokenRecord || refreshTokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({
      where: { id: refreshTokenRecord.id },
    });

    const tokens = await this.generateTokens(
      refreshTokenRecord.user.id,
      refreshTokenRecord.user.role,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async registerDriver(dto: RegisterDriverDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existingUser) {
      throw new BadRequestException('Phone number already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        passwordHash,
        role: 'DRIVER',
        driverProfile: {
          create: {
            vehicleNumber: dto.vehicleNumber,
            vehicleType: dto.vehicleType,
            licenseNumber: dto.licenseNumber,
            totalSeats: dto.totalSeats || 14,
          },
        },
      },
      include: { driverProfile: true },
    });

    return {
      message: 'Driver registered successfully. Pending admin approval.',
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        driverProfile: user.driverProfile,
      },
    };
  }

  private async generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };

    const accessToken = this.jwtService.sign(payload);
    
    const refreshToken = uuidv4();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: refreshExpiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { driverProfile: true },
    });
  }
}
