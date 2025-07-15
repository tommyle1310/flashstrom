import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  ParseUUIDPipe
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdatePermissionsDto } from './dto/update-admin.dto'; // Fix import
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionGuard } from './guards/permission.guard'; // Đã fix đường dẫn
import { Permissions } from './decorators/permissions.decorator';
import { AdminPermission, AdminRole } from 'src/utils/types/admin';
import { SearchInternalUserDto } from './dto/search-internal-user.dto';
import { SearchGroupChatMembersDto } from './dto/search-group-chat-members.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @UseGuards(PermissionGuard)
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

  @Get('internal-users/search')
  searchInternalUsers(@Query() searchDto: SearchInternalUserDto) {
    return this.adminService.searchInternalUsers(searchDto);
  }

  @Get('group-chat/:groupId/members')
  searchGroupChatMembers(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Query() searchDto: SearchGroupChatMembersDto
  ) {
    return this.adminService.searchGroupChatMembers(groupId, searchDto);
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
  @UseGuards(PermissionGuard)
  @Permissions(AdminPermission.MANAGE_ADMINS)
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }

  @Post('toggle-ban/:entityType/:entityId')
  @UseGuards(PermissionGuard)
  @Permissions(AdminPermission.BAN_ACCOUNTS)
  toggleBanAccount(
    @Param('entityType')
    entityType: 'Customer' | 'CustomerCare' | 'Driver' | 'Restaurant',
    @Param('entityId') entityId: string,
    @Req() req: any,
    @Body('reason') reason?: string
  ) {
    return this.adminService.toggleBanAccount(
      entityType,
      entityId,
      req.admin.id,
      reason
    );
  }

  @Patch('permissions/:id')
  @UseGuards(PermissionGuard)
  @Permissions(AdminPermission.MANAGE_ADMINS)
  updatePermissions(
    @Param('id') adminId: string,
    @Body() updatePermissionsDto: UpdatePermissionsDto,
    @Req() req: any
  ) {
    return this.adminService.updatePermissions(
      adminId,
      updatePermissionsDto,
      req.admin.id
    );
  }
}
