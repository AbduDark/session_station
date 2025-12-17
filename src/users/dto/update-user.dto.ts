import { IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: '+201234567890', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone?: string;
}
