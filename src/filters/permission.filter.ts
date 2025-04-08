import { Catch, ArgumentsHost, Injectable, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse, createResponse } from 'src/utils/createResponse';

@Catch()
@Injectable()
export class PermissionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    if (!response || !request) {
      return; // Không phải HTTP context
    }

    if (
      request.response &&
      (request.response as ApiResponse<any>).EC !== undefined
    ) {
      const apiResponse = request.response as ApiResponse<any>;
      return response.status(HttpStatus.OK).json(apiResponse);
    }

    // Fix: Trả response mặc định nếu không có request.response
    const errorResponse = createResponse(
      'ServerError',
      null,
      'An unexpected error occurred'
    );
    return response.status(HttpStatus.OK).json(errorResponse);
  }
}
