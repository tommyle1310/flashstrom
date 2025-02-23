import { PartialType } from '@nestjs/mapped-types';
import { CreateFoodCategoryDto } from './create-food_category.dto';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateFoodCategoryDto extends PartialType(CreateFoodCategoryDto) {
  @IsOptional()
  @IsString()
  readonly name: string;

  @IsOptional()
  @IsString()
  readonly description: string;

  @IsObject()
  @IsOptional()
  readonly avatar: { key: string; url: string };
}
