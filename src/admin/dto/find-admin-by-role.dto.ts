import { IsEnum } from 'class-validator';
import { AdminRole } from 'src/utils/types/admin';

export class FindAdminByRoleDto {
  @IsEnum(AdminRole)
  role: AdminRole;
}
