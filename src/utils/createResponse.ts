import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter
} from '@nestjs/common';
import { ResponseStatus } from './constants';
import { Response } from 'express';
// import { ValidationError } from 'class-validator';

export type ResponseStatusType = keyof typeof ResponseStatus;

export interface ApiResponse<T> {
  EC: number;
  EM: string;
  data: T | null;
}

export function createResponse<T>(
  status: ResponseStatusType,
  data: T | null,
  message?: string
): ApiResponse<T> {
  const statusInfo = ResponseStatus[status];
  const response: ApiResponse<T> = {
    EC: statusInfo.code,
    EM: message || statusInfo.message,
    data
  };

  // Remove the exception throwing logic and just return the response
  return response;
}

@Catch(BadRequestException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const errorResponse = exception.getResponse() as {
      message: string | string[];
    };

    // Xử lý validation errors từ ValidationPipe
    if (Array.isArray(errorResponse.message)) {
      const messages = errorResponse.message;
      const apiResponse = createResponse(
        'InvalidFormatInput',
        messages,
        'Please validate inputs with these errors'
      );
      return response.status(200).json(apiResponse);
    }

    // Xử lý các BadRequestException khác
    const message =
      typeof errorResponse === 'string'
        ? errorResponse
        : errorResponse.message || 'Bad request';
    const apiResponse = createResponse('ServerError', null, message);
    return response.status(200).json(apiResponse);
  }
}
