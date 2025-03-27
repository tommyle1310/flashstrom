import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsArray,
  IsObject
} from 'class-validator';

enum PeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export class CreateStatisticsDto {
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

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  records: string[]; // Danh sách ID của StatisticRecord

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
