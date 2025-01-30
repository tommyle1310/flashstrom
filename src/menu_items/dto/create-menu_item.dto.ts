import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  IsObject,
  IsNumber,
  IsUUID,
} from 'class-validator';

export class CreateMenuItemDto {
  @IsOptional()
  @IsString()
  restaurant_id: string; // The ID of the related restaurant

  @IsString()
  name: string; // Name of the menu item

  @IsOptional()
  @IsString()
  description: string; // Description of the menu item

  @IsOptional()
  @IsNumber()
  price: number; // Price of the menu item

  @IsArray()
  @IsString({ each: true })
  category: string[]; // Array of food category IDs

  @IsOptional()
  @IsObject()
  avatar: {
    key: string;
    url: string;
  };

  @IsOptional()
  @IsBoolean()
  availability: boolean; // Availability of the menu item (true/false)

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggest_notes: string[]; // Suggested notes (e.g., 'no spicy', 'more carrots')

  @IsOptional()
  @IsArray()
  @IsObject({ each: true }) // Expecting array of objects for variants
  variants: {
    variant_id: string; // Variant ID reference
    price?: number; // Price of the variant
    description?: string; // Optional description for the variant
  }[]; // Array of variant objects
}
