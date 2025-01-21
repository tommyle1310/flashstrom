import { IsString, IsEmail, IsEnum, IsArray, IsBoolean, IsOptional, IsObject, IsNumber } from 'class-validator';
import { Enum_UserType } from 'src/types/Payload';

export class CreateUserDto {
  @IsString()
  readonly first_name: string;

  @IsString()
  readonly last_name: string;

  @IsEmail()
  readonly email: string;

  @IsString()
  readonly phone: string;

  @IsEnum(Enum_UserType)
  readonly user_type: Enum_UserType;

  @IsArray()
  readonly address: string[]; // Array of address book IDs

  @IsNumber()
  readonly created_at: number; // Unix timestamp

  @IsNumber()
  readonly updated_at: number; // Unix timestamp

  @IsNumber()
  readonly last_login: number; // Unix timestamp

  @IsObject()
  @IsOptional()
  readonly avatar: { url: string; key: string }; // Optional Avatar with URL and key

  @IsBoolean()
  readonly is_verified: boolean; // Verification status
}
