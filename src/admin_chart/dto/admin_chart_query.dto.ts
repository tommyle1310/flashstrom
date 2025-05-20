import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export class AdminChartQueryDto {
  @IsString()
  start_date: string;

  @IsString()
  end_date: string;

  @IsOptional()
  @IsEnum(PeriodType)
  period_type?: PeriodType = PeriodType.DAILY;

  @IsOptional()
  @IsString()
  force_refresh?: string;
}
