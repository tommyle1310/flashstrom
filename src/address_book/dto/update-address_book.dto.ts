import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  IsOptional
} from 'class-validator';
import { CreateAddressBookDto } from './create-address_book.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateAddressBookDto extends PartialType(CreateAddressBookDto) {
  @IsOptional()
  @IsString()
  readonly street?: string;

  @IsOptional()
  @IsString()
  readonly city?: string;

  @IsOptional()
  @IsString()
  readonly nationality?: string;

  @IsOptional()
  @IsBoolean()
  readonly is_default?: boolean;

  @IsOptional()
  @IsNumber()
  readonly created_at?: number;

  @IsOptional()
  @IsNumber()
  readonly updated_at?: number;

  @IsOptional()
  @IsNumber()
  readonly postal_code?: number;

  @IsOptional()
  @IsObject()
  readonly location?: { lng: number; lat: number };

  @IsOptional()
  @IsString()
  readonly title?: string;
}
