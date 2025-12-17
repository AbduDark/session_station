import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewSecurePass123', description: 'New password (min 6 characters)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
