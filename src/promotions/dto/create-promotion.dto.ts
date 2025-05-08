import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsArray
} from 'class-validator';
import { DiscountType, PromotionStatus } from '../entities/promotion.entity';

// interface BogoDetails {
//   buy_quantity: number;
//   get_quantity: number;
//   max_redemptions?: number;
// }

export class CreatePromotionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  start_date: number;

  @IsNumber()
  end_date: number;

  @IsEnum(DiscountType)
  discount_type: DiscountType;

  @IsNumber()
  discount_value: number;

  @IsNumber()
  promotion_cost_price: number;

  @IsOptional()
  @IsNumber()
  minimum_order_value?: number;

  @IsOptional()
  avatar?: { url: string; key: string };

  @IsEnum(PromotionStatus)
  status: PromotionStatus;

  @IsArray()
  @IsString({ each: true })
  food_category_ids: string[];

  @IsOptional()
  bogo_details?: {
    buy_quantity: number;
    get_quantity: number;
    max_redemptions?: number;
  };
}
