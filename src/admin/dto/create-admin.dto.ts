import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsNumber,
  IsObject
} from 'class-validator';
import { AdminRole, AdminPermission, AdminStatus } from 'src/utils/types/admin';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { Admin } from '../entities/admin.entity';

export class CreateAdminDto {
  @IsString()
  user_id: string;

  @IsEnum(AdminRole)
  role: AdminRole;

  @IsArray()
  permissions: AdminPermission[];

  @IsArray()
  @IsOptional()
  assigned_restaurants?: Restaurant[];

  @IsArray()
  @IsOptional()
  assigned_drivers?: Driver[];

  @IsArray()
  @IsOptional()
  assigned_customer_care?: CustomerCare[];

  @IsOptional()
  @IsNumber()
  created_at?: Date | number;

  @IsString()
  @IsOptional()
  first_name: string;

  @IsString()
  @IsOptional()
  last_name: string;

  @IsOptional()
  @IsObject()
  avatar?: { url: string; key: string };

  @IsOptional()
  @IsNumber()
  updated_at: Date | number;

  @IsString()
  @IsOptional()
  created_by?: Admin;

  @IsEnum(AdminStatus)
  status: AdminStatus;
}
