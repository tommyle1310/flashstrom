import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateOnlineSessionDto {
  @IsString()
  @IsOptional()
  driver_id?: string; // Một trong driver_id hoặc customer_care_id phải có

  @IsString()
  @IsOptional()
  customer_care_id?: string;

  @IsNumber()
  @IsNotEmpty()
  start_time: number; // Thời gian bắt đầu phiên (epoch)

  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  end_time: number; // Thời gian bắt đầu phiên (epoch)

  @IsOptional()
  is_active?: boolean; // Mặc định là true khi tạo
}
