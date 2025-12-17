import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessPaymentDto {
  @ApiProperty({ description: 'Seat hold ID to pay for' })
  @IsString()
  @IsNotEmpty()
  holdId: string;

  @ApiProperty({ description: 'Unique idempotency key to prevent duplicate payments' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiProperty({ example: 'CASH', enum: ['CASH', 'CARD', 'WALLET'], required: false })
  @IsOptional()
  @IsEnum(['CASH', 'CARD', 'WALLET'])
  method?: string;

  @ApiProperty({ description: 'Payment gateway reference', required: false })
  @IsOptional()
  @IsString()
  gatewayReference?: string;
}
