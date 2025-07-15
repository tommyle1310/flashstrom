import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdatePermissionsDto } from './dto/update-admin.dto'; // Fix import
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionGuard } from './guards/permission.guard'; // Đã fix đường dẫn
import { Permissions } from './decorators/permissions.decorator';
import { AdminPermission, AdminRole } from 'src/utils/types/admin';

@Controller('admin-fake')
export class AdminFakeController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @Permissions(AdminPermission.MANAGE_ADMINS)
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @Get()
  findAll() {
    return this.adminService.findAll();
  }

  @Get('by-role/:role')
  findAllByRole(@Param('role') role: AdminRole) {
    return this.adminService.findAllByRole(role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(id, updateAdminDto);
  }

  @Delete(':id')
  @Permissions(AdminPermission.MANAGE_ADMINS)
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }

  @Post('ban/:entityType/:entityId')
  @Permissions(AdminPermission.BAN_ACCOUNTS)
  banAccount(
    @Param('entityType')
    entityType: 'Customer' | 'CustomerCare' | 'Driver' | 'Restaurant',
    @Param('entityId') entityId: string,
    @Body('adminId') adminId: string,
    @Body('reason') reason?: string
  ) {
    return this.adminService.toggleBanAccount(
      entityType,
      entityId,
      adminId,
      reason
    );
  }

  @Patch('permissions/:id')
  @Permissions(AdminPermission.MANAGE_ADMINS)
  updatePermissions(
    @Param('id') adminId: string,
    @Body() updatePermissionsDto: UpdatePermissionsDto,
    @Body('requesterId') requesterId: string
  ) {
    return this.adminService.updatePermissions(
      adminId,
      updatePermissionsDto,
      requesterId
    );
  }
}
