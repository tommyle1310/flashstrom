import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreatePenaltyRuleDto {
  @IsString()
  @IsNotEmpty()
  violation_type: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  default_penalty_points: number;
}
