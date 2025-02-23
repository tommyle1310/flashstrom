import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateFoodCategoryDto {
  @IsString()
  readonly name: string;

  @IsString()
  readonly description: string;

  @IsObject()
  @IsOptional()
  readonly avatar: { key: string; url: string };
}
