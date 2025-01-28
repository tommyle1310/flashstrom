import { PartialType } from '@nestjs/mapped-types';
import { CreateCartItemDto } from './create-cart_item.dto';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCartItemDto extends PartialType(CreateCartItemDto) {
  @IsOptional()
  @IsString()
  item_id: String;

  @IsOptional()
  @IsString()
  variant_id: String;

  @IsOptional()
  @IsString()
  customer_id: String;

  @IsString()
  @IsOptional()
  restaurant_id: String;

  @IsOptional()
  @IsNumber()
  quantity: Number;

  @IsOptional()
  @IsNumber()
  price_at_time_of_addition: Number;
}
