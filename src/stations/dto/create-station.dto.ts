import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStationDto {
  @ApiProperty({ example: 'Ramses Station', description: 'Station name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 30.0626, description: 'Latitude' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 31.2497, description: 'Longitude' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
