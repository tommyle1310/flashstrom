import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { ResponseStatus } from './constants';
import { Response } from 'express';
import { ValidationError } from 'class-validator';

type ResponseData = {
  EC: number; // Custom error code (from HttpStatus)
  EM: string; // Custom message
  data?: any; // Optional additional data
};

export function createResponse(
  httpStatus:
    | 'OK'
    | 'MissingInput'
    | 'InvalidFormatInput'
    | 'Unauthorized'
    | 'ServerError'
    | 'NotFound'
    | 'DuplicatedRecord'
    | 'Forbidden'
    | 'InsufficientBalance'
    | 'NoDrivers'
    | 'NotAcceptingOrders',
  data?: any,
  message?: string,
): ResponseData {
  // Access the corresponding status object from HttpStatus
  const status = ResponseStatus[httpStatus]; // This will return the corresponding status object like { httpCode: 200, message: 'Success', code: 0 }

  // Use the provided message or fallback to the message in HttpStatus
  const responseMessage = message || status.message;

  // Create the response object
  const response: ResponseData = {
    EC: status.code,
    EM: responseMessage,
  };

  // Add data to response if it was provided
  if (data !== undefined) {
    response.data = data;
  }

  // Check if it's an error status, and throw an HttpException
  if (status.httpCode >= 400) {
    throw new HttpException(response, status.httpCode); // Throw HttpException with the response and the status code
  }

  // If it's not an error, return the response
  return response;
}

@Catch(BadRequestException) // Catch BadRequestException for validation errors
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse() as { message: string };

    // Handle if errorResponse is a string
    if (typeof errorResponse === 'string') {
      return response.status(status).json({
        EC: 2,
        EM: 'InvalidFormatInput',
        data: errorResponse, // Send the string as the response
      });
    }

    // Handle if errorResponse is an object with a message property
    if (
      errorResponse &&
      typeof errorResponse === 'object' &&
      'message' in errorResponse
    ) {
      return response.status(status).json({
        EC: 2,
        EM: 'InvalidFormatInput',
        data: errorResponse.message, // Access the message from the object
      });
    }

    // Handle validation errors by mapping over them
    if (Array.isArray(errorResponse.message)) {
      const formattedErrors = errorResponse.message.map(
        (error: ValidationError) => {
          return {
            field: error.property,
            constraints: error.constraints,
          };
        },
      );

      return response.status(status).json({
        EC: -6,
        EM: 'Controller error',
        data: formattedErrors, // Send the formatted validation errors
      });
    }

    // Fallback if the error is not a validation error
    return response.status(status).json({
      EC: -6,
      EM: 'Controller error',
      data: 'An unknown error occurred',
    });
  }
}
