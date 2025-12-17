import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { EmailRegisterDto } from './dto/email-register.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LogoutDto } from './dto/logout.dto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(googleClientId);
  }

  async googleAuth(dto: GoogleAuthDto) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!googleClientId) {
      throw new BadRequestException('Google authentication is not configured');
    }

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new BadRequestException('Invalid Google token');
      }

      const { sub: googleId, email, name, picture } = payload;

      let user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { googleId },
            { email },
          ],
        },
        include: { driverProfile: true },
      });

      if (user) {
        if (!user.googleId) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              googleId,
              authProvider: 'GOOGLE',
              isVerified: true,
              name: user.name || name,
              avatar: user.avatar || picture,
            },
            include: { driverProfile: true },
          });
        }
      } else {
        user = await this.prisma.user.create({
          data: {
            googleId,
            email,
            name,
            avatar: picture,
            authProvider: 'GOOGLE',
            role: (dto.role as any) || 'PASSENGER',
            isVerified: true,
          },
          include: { driverProfile: true },
        });
      }

      const tokens = await this.generateTokens(user.id, user.role);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          isVerified: user.isVerified,
          driverProfile: user.driverProfile,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to verify Google token');
    }
  }

  async emailRegister(dto: EmailRegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        authProvider: 'EMAIL',
        role: (dto.role as any) || 'PASSENGER',
        isVerified: false,
      },
      include: { driverProfile: true },
    });

    const tokens = await this.generateTokens(user.id, user.role);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        driverProfile: user.driverProfile,
      },
    };
  }

  async emailLogin(dto: EmailLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { driverProfile: true },
    });

    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new BadRequestException('Please use Google or phone to login');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.role);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        driverProfile: user.driverProfile,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      return { message: 'If email exists, a reset link will be sent' };
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    console.log(`Password reset token for ${dto.email}: ${token}`);

    return {
      message: 'If email exists, a reset link will be sent',
      resetToken: process.env.NODE_ENV === 'development' ? token : undefined,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!resetToken || resetToken.isUsed || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { isUsed: true },
      }),
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    return { message: 'Password reset successfully' };
  }

  async logout(dto: LogoutDto) {
    const deleted = await this.prisma.refreshToken.deleteMany({
      where: { token: dto.refreshToken },
    });

    if (deleted.count === 0) {
      throw new BadRequestException('Invalid refresh token');
    }

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Logged out from all devices' };
  }

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
          authProvider: 'PHONE',
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
        authProvider: 'PHONE',
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
