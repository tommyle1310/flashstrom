import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsObject
} from 'class-validator';

export class CreateFinanceRuleDto {
  @IsObject()
  @IsNotEmpty()
  driver_fixed_wage: {
    '0-1km': number;
    '1-2km': number;
    '2-3km': number;
    '4-5km': number;
    '>5km': string;
  };

  @IsNumber()
  @IsNotEmpty()
  customer_care_hourly_wage: number;

  @IsNumber()
  @IsNotEmpty()
  app_service_fee: number;

  @IsNumber()
  @IsNotEmpty()
  restaurant_commission: number;

  @IsString()
  @IsNotEmpty()
  created_by_id: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  updated_at?: number;
}
