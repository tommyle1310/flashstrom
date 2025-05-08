import { IsEnum, IsString, IsArray, IsOptional } from 'class-validator';
import {
  FAQStatus,
  FAQType,
  FAQContentBlock,
  FAQTargetUser
} from '../entities/faq.entity';

export class CreateFAQDto {
  @IsString()
  question: string;

  @IsArray()
  answer: FAQContentBlock[];

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
