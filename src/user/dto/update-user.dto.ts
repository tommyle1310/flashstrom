import { IsString, IsEmail, IsEnum, IsArray, IsBoolean, IsOptional, IsObject, IsNumber } from 'class-validator';
import { Enum_UserType } from '../user.schema';
import { CreateUserDto } from './create-user.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateUserDto  extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
   first_name?: string;

  @IsOptional()
  @IsString()
   last_name?: string;

  @IsOptional()
  @IsEmail()
   email?: string;

  @IsOptional()
  @IsString()
   phone?: string;

  @IsOptional()
  @IsEnum(Enum_UserType)
   user_type?: Enum_UserType;

  @IsOptional()
  @IsArray()
   address?: string[]; // Array of address book IDs

  @IsOptional()
  @IsNumber()
   created_at?: number; // Unix timestamp

  @IsOptional()
  @IsNumber()
   updated_at?: number; // Unix timestamp

  @IsOptional()
  @IsNumber()
   last_login?: number; // Unix timestamp

  @IsOptional()
  @IsObject()
   avatar?: { url: string; key: string }; // Optional Avatar with URL and key

  @IsOptional()
  @IsBoolean()
   is_verified?: boolean; // Verification status
}
