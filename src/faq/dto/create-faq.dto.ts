import { IsEnum, IsString, IsArray, IsOptional } from 'class-validator';
import { FAQStatus, FAQType, FAQContentBlock } from '../entities/faq.entity';

export class CreateFAQDto {
  @IsString()
  question: string;

  @IsArray()
  answer: FAQContentBlock[];

  @IsOptional()
  @IsEnum(FAQType)
  type?: FAQType; // Thêm type vào DTO

  @IsOptional()
  @IsEnum(FAQStatus)
  status?: FAQStatus;
}
