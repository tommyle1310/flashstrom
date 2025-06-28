import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsInt,
  Min,
  Max,
  ArrayMaxSize,
  Matches,
  ValidateNested,
  IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  VoucherType,
  VoucherStatus,
  VoucherScope
} from '../entities/voucher.entity';

class TimeRangeDto {
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format'
  })
  start_time: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format'
  })
  end_time: string;
}

export class CreateVoucherDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  start_date: number;

  @IsNumber()
  end_date: number;

  @IsEnum(VoucherType)
  voucher_type: VoucherType;

  @IsNumber()
  @Min(0)
  discount_value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximum_discount_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimum_order_value?: number;

  @IsOptional()
  avatar?: { url: string; key: string };

  @IsEnum(VoucherStatus)
  status: VoucherStatus;

  @IsOptional()
  @IsEnum(VoucherScope)
  scope?: VoucherScope;

  // Usage tracking
  @IsOptional()
  @IsInt()
  @Min(0)
  maximum_usage?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usage_limit_per_customer?: number;

  // Constraints
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  applicable_days?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  applicable_time_ranges?: TimeRangeDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicable_food_category_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicable_restaurant_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excluded_food_category_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excluded_restaurant_ids?: string[];

  // Customer targeting
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specific_customer_ids?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  minimum_orders_required?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimum_total_spent?: number;
}
