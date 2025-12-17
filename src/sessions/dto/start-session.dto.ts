import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartSessionDto {
  @ApiProperty({ description: 'Route ID' })
  @IsString()
  @IsNotEmpty()
  routeId: string;

  @ApiProperty({ description: 'Starting station ID' })
  @IsString()
  @IsNotEmpty()
  stationId: string;

  @ApiProperty({ example: 14, description: 'Total seats available', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  totalSeats?: number;
}
