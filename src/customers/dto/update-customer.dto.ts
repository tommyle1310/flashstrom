import { IsString, IsArray, IsEnum, IsOptional, IsInt } from 'class-validator';
import { Enum_AppTheme } from 'src/types/Payload';
import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerDto } from './create-customer.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @IsOptional()
  @IsString()
  user_id?: string; // Reference to User's id (USR_* format), optional

  @IsOptional()
  @IsString()
  _id?: string; // Reference to User's id (USR_* format), optional

  @IsOptional()
  @IsString()
  first_name: string;

  @IsOptional()
  @IsString()
  last_name: string;

  @IsOptional()
  @IsString()
  address: string;

  @IsOptional()
  avatar?: {
    url: string;
    key: string;
  }; // Avatar object with url and key, optional

  @IsOptional()
  @IsString()
  preferred_category: string; // Array of preferred food category IDs (FC_* format)

  @IsOptional()
  @IsString()
  favorite_restaurants?: string; // Array of favorite restaurant IDs (RES_* format), optional

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  favorite_items?: string[]; // Array of favorite menu IDs (MENU_* format), optional

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  support_tickets?: string[]; // Array of support ticket IDs (ST_* format), optional

  @IsOptional()
  @IsEnum(Enum_AppTheme)
  app_preferences?: {
    theme: Enum_AppTheme;
  }; // User's app theme preference, optional

  @IsOptional()
  @IsInt()
  created_at?: number; // Unix timestamp for when the customer was created, optional

  @IsOptional()
  @IsInt()
  updated_at?: number; // Unix timestamp for when the customer was last updated, optional
}

export class UpdateCustomerPreferredCategoryDto extends UpdateCustomerDto {
  preferred_category: string;
}
export class UpdateCustomerFavoriteRestaurantDto extends UpdateCustomerDto {
  favorite_restaurants: string;
}
