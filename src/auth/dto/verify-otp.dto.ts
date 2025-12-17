import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '+201234567890', description: 'Phone number with country code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  code: string;
}
