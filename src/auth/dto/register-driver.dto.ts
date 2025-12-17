import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDriverDto {
  @ApiProperty({ example: '+201234567890', description: 'Phone number with country code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({ example: 'securepassword123', description: 'Password (min 6 characters)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'ABC-1234', description: 'Vehicle plate number' })
  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;

  @ApiProperty({ example: 'Microbus', description: 'Type of vehicle' })
  @IsString()
  @IsNotEmpty()
  vehicleType: string;

  @ApiProperty({ example: 'DL123456', description: 'Driver license number' })
  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @ApiProperty({ example: 14, description: 'Total seats in vehicle', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  totalSeats?: number;
}
