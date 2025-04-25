import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from '../admin.service';
import { AdminPermission } from 'src/utils/types/admin';
import { createResponse } from 'src/utils/createResponse';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly adminService: AdminService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<AdminPermission[]>(
      PERMISSIONS_KEY,
      context.getHandler()
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (!request) {
      return false;
    }

    const authorization = request.headers['authorization'];

    if (!authorization) {
      request.response = createResponse(
        'Forbidden',
        null,
        'No authorization token provided'
      );
      return false;
    }

    const token = authorization.replace('Bearer ', '').trim();
    if (!token) {
      request.response = createResponse(
        'Forbidden',
        null,
        'Invalid token format'
      );
      return false;
    }

    try {
      const payload = this.jwtService.verify(token);
      // Dùng 'id' thay vì 'adminId' để khớp với payload
      const adminId = payload.id;
      if (!adminId) {
        request.response = createResponse(
          'Forbidden',
          null,
          'Invalid token: No admin ID found'
        );
        return false;
      }

      const adminResponse = await this.adminService.findOne(adminId);
      if (adminResponse.EC !== 0 || !adminResponse.data) {
        request.response = createResponse('NotFound', null, 'Admin not found');
        return false;
      }

      const admin = adminResponse.data;
      const adminPermissions = admin.permissions || [];

      const hasPermission = requiredPermissions.every(permission =>
        adminPermissions.includes(permission)
      );

      if (!hasPermission) {
        request.response = createResponse(
          'Forbidden',
          null,
          `Permission denied: Required permissions - ${requiredPermissions.join(', ')}`
        );
        return false;
      }

      request.admin = admin;
      return true;
    } catch (error: any) {
      console.log('PermissionGuard error:', error);
      request.response = createResponse(
        'ServerError',
        null,
        error.message || 'Invalid token or insufficient permissions'
      );
      return false;
    }
  }
}
