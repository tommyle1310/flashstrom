import { IsOptional, IsString, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum SearchEntityType {
  ALL = 'all',
  RESTAURANT = 'restaurant',
  MENU_ITEM = 'menu_item',
  FOOD_CATEGORY = 'food_category'
}

export class SearchDto {
  @IsString()
  keyword: string;

  @IsOptional()
  @IsEnum(SearchEntityType)
  type?: SearchEntityType = SearchEntityType.ALL;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class SearchResultDto {
  avatar: { url: string; key: string };
  type: string;
  display_name: string;
  address?: any;
  id: string;
  [key: string]: any; // For additional fields based on entity type
}
