import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ResponseType, ActionCode } from '../entities/chatbot_response.entity';

export class SearchChatbotResponseDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(ResponseType)
  response_type?: ResponseType;

  @IsOptional()
  @IsEnum(ActionCode)
  action_code?: ActionCode;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  getall?: boolean;

  @IsOptional()
  @IsString()
  search?: string; // General search term for keyword or response_text

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_active?: boolean;
}
