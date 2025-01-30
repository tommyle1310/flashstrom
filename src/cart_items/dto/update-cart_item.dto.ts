import { PartialType } from '@nestjs/mapped-types';
import { CreateCartItemDto } from './create-cart_item.dto';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCartItemDto extends PartialType(CreateCartItemDto) {
  @IsOptional()
  @IsString()
  item_id: String;

  @IsOptional()
  variants: {
    variant_id: String;
    quantity: Number;
  }[];

  @IsOptional()
  @IsString()
  customer_id: String;

  @IsString()
  @IsOptional()
  restaurant_id: String;
}
