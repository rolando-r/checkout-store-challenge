import { ErrorCode } from './error-codes';

export interface ErrorDetail {
  field?: string;
  issue: string;
}

export abstract class DomainError {
  abstract readonly code: ErrorCode;

  protected constructor(
    readonly message: string,
    readonly details: ErrorDetail[] = [],
  ) {}
}

export class ValidationError extends DomainError {
  readonly code = ErrorCode.ValidationError;
  constructor(details: ErrorDetail[], message = 'Validation failed') {
    super(message, details);
  }
}

export class ProductNotFoundError extends DomainError {
  readonly code = ErrorCode.ProductNotFound;
  constructor(id: string) {
    super(`Product ${id} not found`);
  }
}

export class CustomerNotFoundError extends DomainError {
  readonly code = ErrorCode.CustomerNotFound;
  constructor(id: string) {
    super(`Customer ${id} not found`);
  }
}

export class TransactionNotFoundError extends DomainError {
  readonly code = ErrorCode.TransactionNotFound;
  constructor(id: string) {
    super(`Transaction ${id} not found`);
  }
}

export class OutOfStockError extends DomainError {
  readonly code = ErrorCode.OutOfStock;
  constructor(available: number) {
    super(`Only ${available} units available`, [
      { field: 'quantity', issue: `max ${available}` },
    ]);
  }
}

export class InvalidTransactionStateError extends DomainError {
  readonly code = ErrorCode.InvalidTransactionState;
  constructor(current: string, expected: string) {
    super(`Transaction is ${current}, expected ${expected}`);
  }
}

export class IdempotencyKeyReusedError extends DomainError {
  readonly code = ErrorCode.IdempotencyKeyReused;
  constructor() {
    super('Idempotency-Key was already used with a different payload');
  }
}

export class GatewayRejectedError extends DomainError {
  readonly code = ErrorCode.GatewayRejected;
  constructor(reason: string) {
    super(`Payment gateway rejected the request: ${reason}`);
  }
}

export class GatewayUnavailableError extends DomainError {
  readonly code = ErrorCode.GatewayUnavailable;
  constructor() {
    super('Payment gateway is unavailable, try again shortly');
  }
}

/** Generic on purpose: internals go to the logs, never to the client. */
export class UnexpectedError extends DomainError {
  readonly code = ErrorCode.Internal;
  constructor() {
    super('Unexpected error');
  }
}

export class DeliveryNotFoundError extends DomainError {
  readonly code = ErrorCode.DeliveryNotFound;
  constructor(transactionId: string) {
    super(`No delivery found for transaction ${transactionId}`);
  }
}