import {
  IsString,
  IsEmail,
  IsEnum,
  IsArray,
  IsBoolean,
  IsOptional,
  IsObject,
  IsNumber,
} from 'class-validator';

export class CreateDriverDto {
  @IsString()
  readonly user_id: string; // Driver's first name

  @IsString()
  readonly first_name: string; // Driver's first name

  @IsString()
  readonly last_name: string; // Driver's last name

  @IsArray()
  readonly contact_email: {
    title: string;
    is_default: boolean;
    email: string;
  }[]; // Array of contact emails

  @IsArray()
  readonly contact_phone: {
    title: string;
    number: string;
    is_default: boolean;
  }[]; // Array of contact phone numbers

  @IsObject()
  readonly vehicle: {
    license_plate: string;
    model: string;
    color: string;
  }; // Vehicle information

  @IsObject()
  readonly current_location: {
    lat: number;
    lng: number;
  }; // Current location with latitude and longitude

  @IsArray()
  readonly current_order_id: string[]; // Array of order IDs (max 3 orders)

  @IsNumber()
  readonly created_at: number; // Unix timestamp for creation time

  @IsNumber()
  readonly updated_at: number; // Unix timestamp for last update time

  @IsNumber()
  readonly last_login: number; // Unix timestamp for last login time

  @IsObject()
  @IsOptional()
  readonly avatar: { key: string; url: string }; // Optional avatar with key and url

  @IsBoolean()
  readonly available_for_work: boolean; // Indicates if the driver is available for work

  @IsBoolean()
  readonly is_on_delivery: boolean; // Indicates if the driver is currently on a delivery

  @IsObject()
  @IsOptional()
  readonly rating: {
    average_rating: number;
    review_count: number;
  }; // Optional rating object with average rating and review count
}
