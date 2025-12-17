import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddStationDto {
  @ApiProperty({ description: 'Station ID to add' })
  @IsString()
  @IsNotEmpty()
  stationId: string;

  @ApiProperty({ example: 1, description: 'Order of the station in the route' })
  @IsInt()
  @Min(1)
  order: number;
}
