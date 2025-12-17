import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateComplaintDto {
  @ApiProperty({ description: 'Booking ID related to the complaint', required: false })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty({ example: 'Driver was rude', description: 'Complaint message' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
