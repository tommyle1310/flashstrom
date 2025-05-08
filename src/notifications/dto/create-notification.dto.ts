import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsObject,
  IsEnum,
  IsArray
} from 'class-validator';
import { TargetUser } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsObject()
  @IsNotEmpty()
  avatar: { url: string; key: string };

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  desc: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsArray()
  @IsEnum(TargetUser, { each: true })
  @IsNotEmpty()
  target_user: TargetUser[];

  @IsString()
  @IsNotEmpty()
  created_by_id: string;

  @IsString()
  @IsOptional()
  target_user_id?: string;
}
