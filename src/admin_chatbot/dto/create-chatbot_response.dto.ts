import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  ValidateNested,
  IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';
import { ResponseType } from '../entities/chatbot_response.entity';

// Define ChatbotOption as a class for @Type() compatibility
export class ChatbotOption {
  @IsNumber()
  id: number;

  @IsString()
  text: string;

  @IsOptional()
  @IsNumber()
  next_id?: number;
}

export class CreateChatbotResponseDto {
  @IsString()
  keyword: string;

  @IsEnum(ResponseType)
  response_type: ResponseType;

  @IsString()
  response_text: string;

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
