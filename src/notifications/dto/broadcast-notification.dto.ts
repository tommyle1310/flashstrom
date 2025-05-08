// src/notifications/dto/broadcast-notification.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsEnum,
  IsArray,
  IsOptional,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { TargetUser } from '../entities/notification.entity';

// Class cho avatar
class Avatar {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  key: string;
}

// Class cho nội dung của từng target
class TargetContent {
  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Avatar) // Transform avatar thành instance của Avatar
  avatar: Avatar;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  desc: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => Avatar) // Transform avatar thành instance của Avatar
  image?: Avatar;

  @IsString()
  @IsOptional()
  link?: string;
}

// Class cho content
class Content {
  @ValidateNested()
  @Type(() => TargetContent)
  @IsOptional()
  customer?: TargetContent;

  @ValidateNested()
  @Type(() => TargetContent)
  @IsOptional()
  restaurant?: TargetContent;

  @ValidateNested()
  @Type(() => TargetContent)
  @IsOptional()
  driver?: TargetContent;

  @ValidateNested()
  @Type(() => TargetContent)
  @IsOptional()
  customer_care?: TargetContent;
}

export class BroadcastNotificationDto {
  @IsArray()
  @IsEnum(TargetUser, { each: true })
  @IsNotEmpty()
  target_user: TargetUser[];

  @IsString()
  @IsNotEmpty()
  created_by_id: string;

  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Content)
  content: Content;
}
