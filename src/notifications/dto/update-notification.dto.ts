import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationDto } from './create-notification.dto';
import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsArray,
  IsBoolean
} from 'class-validator';
import { TargetUser } from '../entities/notification.entity';

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @IsObject()
  @IsOptional()
  avatar?: { url: string; key: string };

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  desc?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsArray()
  @IsEnum(TargetUser, { each: true })
  @IsOptional()
  target_user?: TargetUser[];

  @IsString()
  @IsOptional()
  target_user_id?: string;

  @IsBoolean()
  @IsOptional()
  is_read?: boolean;
}
