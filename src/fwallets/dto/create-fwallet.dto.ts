import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateFWalletDto {
  @IsOptional()
  @IsString()
  readonly user_id: string; // User ID the wallet belongs to

  @IsOptional()
  @IsNumber()
  readonly balance: number; // Wallet balance

  @IsString()
  readonly email: string; // email

  @IsString()
  readonly password: string; // password

  @IsOptional()
  @IsString()
  readonly first_name: string; // User's first name

  @IsOptional()
  @IsString()
  readonly last_name: string; // User's last name
}
