import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  IdentityRestrictedException,
  RateLimitExceededException,
  SeatNotAvailableException,
} from '@tatkal/shared';

/**
 * Maps domain exceptions from @tatkal/shared (framework-agnostic Error
 * subclasses) to proper HTTP status codes. Without this, Nest serializes
 * them as generic 500s and clients cannot distinguish "sold out" from
 * "server broke".
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Already an HTTP exception — let Nest's default shape through.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(
        typeof body === 'string' ? { statusCode: status, message: body } : body,
      );
      return;
    }

    // Map domain exceptions → status codes + machine-readable codes.
    // Using `new (...args: never[]) => Error` so classes with constructor
    // arguments (IdentityRestrictedException) are accepted.
    const domainMap: Array<[new (...args: never[]) => Error, HttpStatus, string]> = [
      [SeatNotAvailableException, HttpStatus.CONFLICT, 'SEAT_NOT_AVAILABLE'],
      [RateLimitExceededException, HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED'],
      [IdentityRestrictedException, HttpStatus.FORBIDDEN, 'IDENTITY_RESTRICTED'],
    ];

    for (const [ctor, status, code] of domainMap) {
      if (exception instanceof ctor) {
        response.status(status).json({
          statusCode: status,
          error: code,
          message: (exception as Error).message,
          path: request.url,
        });
        return;
      }
    }

    // Unknown error — log and return a safe 500 (never leak internals).
    this.logger.error(
      `Unhandled exception on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      path: request.url,
    });
  }
}
