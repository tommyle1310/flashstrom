import { PartialType } from '@nestjs/mapped-types';
import { CreateFAQDto } from './create-faq.dto';
import { IsEnum, IsString, IsArray, IsOptional } from 'class-validator';
import {
  FAQStatus,
  FAQType,
  FAQContentBlock,
  FAQTargetUser
} from '../entities/faq.entity';

export class UpdateFAQDto extends PartialType(CreateFAQDto) {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsArray()
  answer?: FAQContentBlock[];

  @IsOptional()
  @IsEnum(FAQType)
  type?: FAQType;

  @IsOptional()
  @IsEnum(FAQStatus)
  status?: FAQStatus;

  @IsOptional()
  @IsArray()
  @IsEnum(FAQTargetUser, { each: true }) // Validate từng phần tử trong mảng
  target_user?: FAQTargetUser[]; // Thêm field target_user
}
