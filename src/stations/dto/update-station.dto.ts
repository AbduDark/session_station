import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStationDto {
  @ApiProperty({ example: 'Ramses Station', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 30.0626, required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ example: 31.2497, required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
