import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRouteDto {
  @ApiProperty({ example: 'Cairo - Alexandria', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 50, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseFare?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
