import { IsString, IsNotEmpty, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
  @ApiProperty({ example: '+201234567890', description: 'Phone number with country code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({ example: 'PASSENGER', enum: ['PASSENGER', 'DRIVER', 'ADMIN'], required: false })
  @IsOptional()
  @IsEnum(['PASSENGER', 'DRIVER', 'ADMIN'])
  role?: string;
}
