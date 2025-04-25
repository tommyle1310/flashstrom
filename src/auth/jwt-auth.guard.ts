import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createResponse } from 'src/utils/createResponse';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
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
      const userId = payload.id;
      if (!userId) {
        request.response = createResponse(
          'Forbidden',
          null,
          'Invalid token: No user ID found'
        );
        return false;
      }
      request.user = payload; // Gán toàn bộ payload vào request.user
      return true;
    } catch (error: any) {
      console.log('JwtAuthGuard error:', error);
      request.response = createResponse(
        'ServerError',
        null,
        error.message || 'Invalid token or insufficient permissions'
      );
      return false;
    }
  }
}
