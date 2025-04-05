import { PartialType } from '@nestjs/mapped-types';
import { CreateFAQDto } from './create-faq.dto';
import { IsEnum, IsString, IsArray, IsOptional } from 'class-validator';
import { FAQStatus, FAQType, FAQContentBlock } from '../entities/faq.entity';

export class UpdateFAQDto extends PartialType(CreateFAQDto) {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsArray()
  answer?: FAQContentBlock[];

  @IsOptional()
  @IsEnum(FAQType)
  type?: FAQType; // Thêm type vào DTO

  @IsOptional()
  @IsEnum(FAQStatus)
  status?: FAQStatus;
}
