import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateComplaintDto {
  @ApiProperty({ example: 'IN_REVIEW', enum: ['OPEN', 'IN_REVIEW', 'CLOSED'], required: false })
  @IsOptional()
  @IsEnum(['OPEN', 'IN_REVIEW', 'CLOSED'])
  status?: string;

  @ApiProperty({ description: 'Admin note about the complaint', required: false })
  @IsOptional()
  @IsString()
  adminNote?: string;
}
