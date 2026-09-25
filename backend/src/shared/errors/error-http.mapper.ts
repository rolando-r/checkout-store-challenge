import { DomainError, ErrorDetail } from './domain-error';
import { ErrorCode } from './error-codes';

export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.ValidationError]: 400,
  [ErrorCode.ProductNotFound]: 404,
  [ErrorCode.CustomerNotFound]: 404,
  [ErrorCode.TransactionNotFound]: 404,
  [ErrorCode.OutOfStock]: 409,
  [ErrorCode.InvalidTransactionState]: 409,
  [ErrorCode.IdempotencyKeyReused]: 422,
  [ErrorCode.GatewayRejected]: 502,
  [ErrorCode.GatewayUnavailable]: 503,
  [ErrorCode.RateLimited]: 429,
  [ErrorCode.Internal]: 500,
  [ErrorCode.DeliveryNotFound]: 404,
};

export interface ErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details: ErrorDetail[];
  requestId: string;
}

export const toHttpError = (
  error: DomainError,
  requestId: string,
): ErrorBody => ({
  statusCode: ERROR_HTTP_STATUS[error.code],
  code: error.code,
  message: error.message,
  details: error.details,
  requestId,
});