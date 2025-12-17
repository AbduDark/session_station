import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHoldDto {
  @ApiProperty({ description: 'Session ID to book seats in' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ example: 1, description: 'Number of seats to hold', minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  seatsCount: number;
}
