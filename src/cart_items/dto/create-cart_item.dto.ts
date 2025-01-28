import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCartItemDto {
  @IsString()
  item_id: String;

  @IsOptional()
  @IsString()
  variant_id: String;

  @IsString()
  @IsOptional()
  customer_id: String;

  @IsString()
  @IsOptional()
  restaurant_id: String;

  @IsNumber()
  quantity: Number;

  @IsNumber()
  price_at_time_of_addition: Number;
}
