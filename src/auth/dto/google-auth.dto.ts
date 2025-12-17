import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID token from mobile app' })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiProperty({ example: 'PASSENGER', enum: ['PASSENGER', 'DRIVER'], required: false })
  @IsOptional()
  @IsEnum(['PASSENGER', 'DRIVER'])
  role?: string;
}
