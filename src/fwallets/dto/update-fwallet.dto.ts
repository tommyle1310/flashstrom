import { PartialType } from '@nestjs/mapped-types';
import { CreateFWalletDto } from './create-fwallet.dto';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateFwalletDto extends PartialType(CreateFWalletDto) {
    @IsOptional()
  @IsNumber()
  readonly balance?: number;  // Optional: update wallet balance

  @IsOptional()  
  @IsString()
  readonly email: string;  // email

  @IsOptional()
  @IsString()
  readonly password: string;  // password

  @IsOptional()
  @IsString()
  readonly first_name?: string;  // Optional: update first name

  @IsOptional()
  @IsString()
  readonly last_name?: string;  // Optional: update last name
}
