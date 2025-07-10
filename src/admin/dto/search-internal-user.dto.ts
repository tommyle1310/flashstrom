import { IsOptional, IsString, IsIn } from 'class-validator';

export class SearchInternalUserDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'customer_care'])
  role?: 'admin' | 'customer_care';
}
