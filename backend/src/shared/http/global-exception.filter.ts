import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { DomainError } from '../errors/domain-error';
import { toHttpError } from '../errors/error-http.mapper';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) ?? randomUUID();

    if (exception instanceof DomainError) {
      const body = toHttpError(exception, requestId);
      response.status(body.statusCode).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      // class-validator / Nest's own ValidationPipe errors land here
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as Record<string, unknown>).message as string) ?? 'Validation failed';
      response.status(status).json({
        statusCode: status,
        code: 'VALIDATION_ERROR',
        message: Array.isArray(message) ? message.join(', ') : message,
        details: [],
        requestId,
      });
      return;
    }

    // eslint-disable-next-line no-console
    console.error('Unexpected error', exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error',
      details: [],
      requestId,
    });
  }
}