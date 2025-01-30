import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCartItemDto {
  @IsString()
  item_id: String;

  @IsOptional()
  variants: {
    variant_id: String;
    quantity: Number;
  }[];

  @IsString()
  @IsOptional()
  customer_id: String;

  @IsString()
  @IsOptional()
  restaurant_id: String;
}
