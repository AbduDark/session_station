import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  @ApiOperation({ summary: 'Request OTP for phone verification' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid phone number or rate limited' })
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and get access tokens' })
  @ApiResponse({ status: 200, description: 'OTP verified, tokens returned' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'New tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('register-driver')
  @ApiOperation({ summary: 'Register a new driver account' })
  @ApiResponse({ status: 201, description: 'Driver registered, pending approval' })
  @ApiResponse({ status: 400, description: 'Phone already registered' })
  async registerDriver(@Body() dto: RegisterDriverDto) {
    return this.authService.registerDriver(dto);
  }
}
