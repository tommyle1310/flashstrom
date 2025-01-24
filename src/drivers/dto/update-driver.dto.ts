import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  IsInt,
  IsObject,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Enum_AppTheme } from 'src/types/Payload'; // Importing Enum_AppTheme from the schema
import { PartialType } from '@nestjs/mapped-types';
import { CreateDriverDto } from './create-driver.dto';

export class UpdateDriverDto extends PartialType(CreateDriverDto) {
  @IsOptional()
  @IsString()
  first_name: string; // Driver's first name

  @IsOptional()
  @IsString()
  last_name: string; // Driver's last name

  @IsOptional()
  @IsArray()
  contact_email: { title: string; is_default: boolean; email: string }[]; // Array of contact emails

  @IsOptional()
  @IsArray()
  contact_phone: { title: string; number: string; is_default: boolean }[]; // Array of contact phone numbers

  @IsOptional()
  @IsObject()
  vehicle: {
    license_plate: string;
    model: string;
    color: string;
  }; // Vehicle information

  @IsOptional()
  @IsObject()
  current_location: {
    lat: number;
    lon: number;
  }; // Current location with latitude and longitude

  @IsOptional()
  @IsArray()
  current_order_id: string[]; // Array of order IDs (max 3 orders)

  @IsOptional()
  @IsNumber()
  created_at: number; // Unix timestamp for creation time

  @IsOptional()
  @IsNumber()
  updated_at: number; // Unix timestamp for last update time

  @IsOptional()
  @IsNumber()
  last_login: number; // Unix timestamp for last login time

  @IsOptional()
  @IsObject()
  @IsOptional()
  avatar: { key: string; url: string }; // Optional avatar with key and url

  @IsOptional()
  @IsBoolean()
  available_for_work: boolean; // Indicates if the driver is available for work

  @IsOptional()
  @IsBoolean()
  is_on_delivery: boolean; // Indicates if the driver is currently on a delivery

  @IsObject()
  @IsOptional()
  rating: {
    average_rating: number;
    review_count: number;
  }; // Optional rating object with average rating and review count
}
