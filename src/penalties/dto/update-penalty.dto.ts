import { PartialType } from '@nestjs/mapped-types';
import { CreatePenaltyDto } from './create-penalty.dto';
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

enum PenaltyStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  APPEALED = 'appealed'
}

export class UpdatePenaltyDto extends PartialType(CreatePenaltyDto) {
  @IsString()
  @IsOptional()
  description?: string; // Cập nhật mô tả chi tiết lỗi

  @IsNumber()
  @IsOptional()
  penalty_points?: number; // Cập nhật điểm phạt

  @IsEnum(PenaltyStatus)
  @IsOptional()
  status?: string; // Cập nhật trạng thái

  @IsNumber()
  @IsOptional()
  expires_at?: number; // Cập nhật thời gian hết hạn
}
