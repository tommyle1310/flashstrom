import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

// Enum for status
export enum PromotionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
}

// Enum for discount type
export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export class CreatePromotionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  start_date: number;

  @IsOptional()
  @IsNumber()
  end_date: number;

  @IsEnum(DiscountType) // Validates the discount_type against the DiscountType enum
  discount_type: DiscountType;

  @IsNumber()
  discount_value: number;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  minimum_order_value: number;

  @IsOptional()
  @IsEnum(PromotionStatus) // Validates the status against the PromotionStatus enum
  status: PromotionStatus;

  @IsOptional()
  @IsString({ each: true }) // Ensures that each item in the array is a string
  food_categories: string[];
}
