import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  payload: Record<string, any>;
}
