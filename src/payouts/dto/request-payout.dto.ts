import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPayoutDto {
  @ApiProperty({ description: 'Session ID to request payout for' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
