import { IsString, IsArray, IsEnum, IsOptional, IsInt } from 'class-validator';
import { Enum_AppTheme } from 'src/types/Payload'; // Importing Enum_AppTheme from the schema

export class CreateCustomerDto {
  
  @IsString()
  user_id: string; 
  
  @IsString()
  first_name: string; 

  @IsString()
  last_name: string; 

  @IsOptional()
  avatar?: { 
    url: string; 
    key: string; 
  }; // Avatar object with url and key, optional

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  preferred_category: string[]; // Array of preferred food category IDs (FC_* format)

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  favorite_restaurants: string[]; // Array of favorite restaurant IDs (RES_* format)

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  favorite_items: string[]; // Array of favorite menu IDs (MENU_* format)

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  support_tickets: string[]; // Array of support ticket IDs (ST_* format)

  @IsEnum(Enum_AppTheme)
  @IsOptional()
  app_preferences: { 
    theme: Enum_AppTheme; 
  }; // User's app theme preference

  @IsOptional()
  @IsInt()
  created_at: number; // Unix timestamp for when the customer is created

  @IsOptional()
  @IsInt()
  updated_at: number; // Unix timestamp for when the customer was last updated
}
