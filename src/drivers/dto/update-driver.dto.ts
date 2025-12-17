import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDriverDto {
  @ApiProperty({ example: 'ABC-1234', required: false })
  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @ApiProperty({ example: 'Microbus', required: false })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiProperty({ example: 'DL123456', required: false })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ example: 14, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  totalSeats?: number;
}
