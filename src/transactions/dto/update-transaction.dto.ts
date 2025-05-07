import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {
  @IsEnum(['DEPOSIT', 'WITHDRAW', 'PURCHASE', 'REFUND'])
  @IsOptional()
  transaction_type?: 'DEPOSIT' | 'WITHDRAW' | 'PURCHASE' | 'REFUND'; // Type of transaction

  @IsNumber()
  @IsOptional()
  amount?: number; // Amount involved in the transaction

  @IsNumber()
  @IsOptional()
  balance_after?: number; // Wallet balance after the transaction

  @IsEnum(['PENDING', 'CANCELLED', 'FAILED', 'COMPLETED'])
  @IsOptional()
  status?: 'PENDING' | 'CANCELLED' | 'FAILED' | 'COMPLETED'; // Status of the transaction

  @IsEnum(['MOMO', 'FWALLET'])
  @IsOptional()
  source?: 'MOMO' | 'FWALLET'; // Source of transaction (MOMO or FWALLET)

  @IsString()
  @IsOptional()
  destination?: string; // Can be `fwallet.id` or `users.id` depending on the transaction

  @IsNumber()
  @IsOptional()
  updated_at?: number;
}
