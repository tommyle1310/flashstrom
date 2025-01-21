import { IsString, IsArray, IsEnum, IsOptional, IsInt, IsObject, IsNumber, IsBoolean } from 'class-validator';
import { Enum_AppTheme } from 'src/types/Payload'; // Importing Enum_AppTheme from the schema
import { PartialType } from '@nestjs/mapped-types';
import { CreateDriverDto } from './create-driver.dto';

export class UpdateDriverDto extends PartialType(CreateDriverDto) {
  @IsOptional()
  @IsString()
    readonly first_name: string; // Driver's first name
  
   @IsOptional()
    @IsString()
    readonly last_name: string; // Driver's last name
  
   @IsOptional()
    @IsArray()
    readonly contact_email: { title: string; is_default: boolean; email: string }[]; // Array of contact emails
  
   @IsOptional()
    @IsArray()
    readonly contact_phone: { number: string; is_default: boolean }[]; // Array of contact phone numbers
  
   @IsOptional()
    @IsObject()
    readonly vehicle: {
      license_plate: string;
      model: string;
      color: string;
    }; // Vehicle information
  
    @IsOptional()
    @IsObject()
    readonly current_location: {
      lat: number;
      lon: number;
    }; // Current location with latitude and longitude
  
    @IsOptional()
    @IsArray()
    readonly current_order_id: string[]; // Array of order IDs (max 3 orders)
  
    @IsOptional()
    @IsNumber()
    readonly created_at: number; // Unix timestamp for creation time
  
    @IsOptional()
    @IsNumber()
    readonly updated_at: number; // Unix timestamp for last update time
  
    @IsOptional()
    @IsNumber()
    readonly last_login: number; // Unix timestamp for last login time
  
    @IsOptional()
    @IsObject()
    @IsOptional()
    readonly avatar: { key: string; url: string }; // Optional avatar with key and url
  
    @IsOptional()
    @IsBoolean()
    readonly available_for_work: boolean; // Indicates if the driver is available for work
  
    @IsOptional()
    @IsBoolean()
    readonly is_on_delivery: boolean; // Indicates if the driver is currently on a delivery
  
    @IsObject()
    @IsOptional()
    readonly rating: {
      average_rating: number;
      review_count: number;
    }; // Optional rating object with average rating and review count
  }
