import {
  IsOptional,
  IsString,
  IsNumber,
  ValidateNested,
  IsEnum
} from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsNumber()
  @IsOptional()
  latitude: number;

  @IsNumber()
  @IsOptional()
  longitude: number;
}

class DetailsDto {
  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  tip?: number;

  @ValidateNested()
  @IsOptional()
  weather?: {
    temperature?: number;
    condition?: string;
  };
}

export class UpdateDriverProgressStageDto {
  @IsEnum([
    'driver_ready',
    'waiting_for_pickup',
    'restaurant_pickup',
    'en_route_to_customer',
    'delivery_complete'
  ])
  @IsOptional()
  current_state?: string;

  @ValidateNested()
  @Type(() => DetailsDto)
  @IsOptional()
  details?: DetailsDto;
}
