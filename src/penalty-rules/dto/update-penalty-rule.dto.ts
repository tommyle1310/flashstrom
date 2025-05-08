import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdatePenaltyRuleDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  default_penalty_points?: number;
}
