import {
  IsString,
  IsOptional,
  IsObject,
  IsBoolean,
  IsNumber
} from 'class-validator';

export class UpdateMenuItemVariantDto {
  @IsString()
  menu_id: string; // The ID of the related menu item

  @IsOptional()
  @IsString()
  variant: string; // Name or type of the variant (e.g., "small", "large", "extra spicy")

  @IsOptional()
  @IsString()
  description: string; // Description of the variant

  @IsOptional()
  @IsObject()
  avatar: {
    key: string; // Key of the avatar image
    url: string; // URL for the avatar image
  };

  @IsOptional()
  @IsBoolean()
  availability: boolean; // Availability of the variant (true/false)

  @IsOptional()
  @IsNumber()
  discount_rate: number; // Discount rate in percentage (0-100)
}
