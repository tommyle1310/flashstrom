import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {
  IsOptional,
  IsDate,
  IsNumber,
  IsString,
  IsArray,
  IsEnum
} from 'class-validator';
import { Enum_AppTheme, Enum_UserType } from 'src/types/Payload';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  readonly verification_code?: string;
  @IsOptional()
  @IsNumber()
  readonly balance?: number;
  @IsOptional()
  @IsString()
  readonly reset_token?: string;

  @IsOptional()
  readonly reset_token_expiry?: Date;

  @IsOptional()
  readonly password?: string;

  @IsOptional()
  readonly app_preferences?: { theme: Enum_AppTheme };

  @IsOptional()
  @IsDate()
  readonly last_login?: Date;

  @IsOptional()
  @IsArray()
  @IsEnum(Enum_UserType, { each: true })
  readonly user_type?: Enum_UserType[];
}
