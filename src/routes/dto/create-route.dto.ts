import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRouteDto {
  @ApiProperty({ example: 'Cairo - Alexandria', description: 'Route name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 50, description: 'Base fare in EGP' })
  @IsNumber()
  @Min(0)
  baseFare: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
