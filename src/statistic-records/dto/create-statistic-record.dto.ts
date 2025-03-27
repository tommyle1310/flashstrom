import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsObject
} from 'class-validator';

enum PeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export class CreateStatisticRecordDto {
  @IsString()
  @IsOptional()
  driver_id?: string;

  @IsString()
  @IsOptional()
  customer_care_id?: string;

  @IsString()
  @IsOptional()
  restaurant_id?: string;

  @IsEnum(PeriodType)
  @IsNotEmpty()
  period_type: string;

  @IsNumber()
  @IsNotEmpty()
  period_start: number;

  @IsNumber()
  @IsNotEmpty()
  period_end: number;

  @IsObject()
  @IsNotEmpty()
  data: {
    online_hours?: number;
    total_orders?: number;
    tickets_resolved?: number;
    earnings?: number;
    [key: string]: any;
  };
}
