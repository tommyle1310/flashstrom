import { PartialType } from '@nestjs/mapped-types';
import { CreateMenuItemDto } from './create-menu_item.dto';
import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  IsObject,
  IsNumber,
} from 'class-validator';

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {
  @IsOptional()
  @IsString()
  restaurant_id: string; // The ID of the related restaurant

  @IsOptional()
  @IsString()
  name: string; // Name of the menu item

  @IsOptional()
  @IsString()
  description: string; // Description of the menu item

  @IsOptional()
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
  @IsString({ each: true })
  variants: string[]; // Array of menu item variant IDs
}
