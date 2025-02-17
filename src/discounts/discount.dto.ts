import { IsString, IsNumber, IsOptional, IsEnum, IsInt } from 'class-validator';

// Enum for discount types
export enum DiscountType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE'
}

export class DiscountDto {
  @IsOptional()
  @IsEnum(DiscountType)
  discount_type: DiscountType; // Type of discount (fixed or percentage)

  @IsOptional()
  @IsNumber()
  @IsInt()
  discount_value: number; // Discount value (can be a fixed amount or percentage)

  @IsOptional()
  @IsNumber()
  @IsInt()
  start_date: number; // Start date of the discount (Unix timestamp)

  @IsOptional()
  @IsNumber()
  @IsInt()
  end_date: number; // End date of the discount (Unix timestamp)
}
