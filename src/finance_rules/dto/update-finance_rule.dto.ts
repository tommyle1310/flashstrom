import { PartialType } from '@nestjs/mapped-types';
import { CreateFinanceRuleDto } from './create-finance_rule.dto';
import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class UpdateFinanceRuleDto extends PartialType(CreateFinanceRuleDto) {
  @IsObject()
  @IsOptional()
  driver_fixed_wage?: {
    '0-1km': number;
    '1-2km': number;
    '2-3km': number;
    '4-5km': number;
    '>5km': string;
  };

  @IsNumber()
  @IsOptional()
  customer_care_hourly_wage?: number;

  @IsNumber()
  @IsOptional()
  app_service_fee?: number;

  @IsNumber()
  @IsOptional()
  restaurant_commission?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  updated_at?: number;
}
