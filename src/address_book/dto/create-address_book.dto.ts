import { IsString, IsNumber, IsBoolean, IsObject } from 'class-validator';

export class CreateAddressBookDto {
  @IsString()
  readonly street: string;

  @IsString()
  readonly city: string;

  @IsString()
  readonly nationality: string;

  @IsBoolean()
  readonly is_default: boolean;

  @IsNumber()
  readonly created_at: number;

  @IsNumber()
  readonly updated_at: number;

  @IsNumber()
  readonly postal_code: number;

  @IsObject()
  readonly location: { lng: number; lat: number };

  @IsString()
  readonly title: string;
}
