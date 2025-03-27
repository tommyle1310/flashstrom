import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsEnum
} from 'class-validator';

enum PenaltyStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  APPEALED = 'appealed'
}

export class CreatePenaltyDto {
  @IsString()
  @IsOptional()
  driver_id?: string;

  @IsString()
  @IsOptional()
  customer_care_id?: string;

  @IsString()
  @IsOptional()
  restaurant_id?: string;

  @IsString()
  @IsNotEmpty()
  penaltied_by_id: string;

  @IsString()
  @IsNotEmpty()
  rule_id: string; // Thay vì violation_type

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  penalty_points: number;

  @IsEnum(PenaltyStatus)
  @IsNotEmpty()
  status: string;

  @IsNumber()
  @IsNotEmpty()
  issued_at: number;

  @IsNumber()
  @IsOptional()
  expires_at?: number;
}
