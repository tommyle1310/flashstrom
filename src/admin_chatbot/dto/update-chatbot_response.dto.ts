import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { ResponseType } from '../entities/chatbot_response.entity';
import { ChatbotOption } from './create-chatbot_response.dto'; // Reference the class from the other DTO

export class UpdateChatbotResponseDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(ResponseType)
  response_type?: ResponseType;

  @IsOptional()
  @IsString()
  response_text?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatbotOption)
  options?: ChatbotOption[];

  @IsOptional()
  @IsNumber()
  parent_id?: number;

  @IsOptional()
  @IsString()
  action_code?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
