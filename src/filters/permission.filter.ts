// src/filters/permission.filter.ts
import { Catch, ArgumentsHost, Injectable, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse, createResponse } from '../utils/createResponse';

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

    // Log exception để debug
    console.error('Exception caught in PermissionFilter:', exception);

    // Nếu response đã được gửi bởi filter khác (HttpExceptionFilter), không làm gì
    if (response.headersSent) {
      return;
    }

    // Nếu có request.response từ service, dùng nó
    if (
      request.response &&
      (request.response as ApiResponse<any>).EC !== undefined
    ) {
      const apiResponse = request.response as ApiResponse<any>;
      return response.status(HttpStatus.OK).json(apiResponse);
    }

    // Fallback for unhandled errors
    const isProduction = process.env.NODE_ENV === 'production';
    const message = isProduction
      ? 'An internal server error occurred.'
      : exception.message || 'An unexpected error occurred';

    // Check if it's a view rendering error and send an appropriate status code
    if (exception.view) {
      // This is likely a template rendering error
      const errorResponse = createResponse('ServerError', null, message);
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
    }

    const errorResponse = createResponse('ServerError', null, message);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
}
