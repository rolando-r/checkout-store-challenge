export const ErrorCode = {
  ValidationError: 'VALIDATION_ERROR',
  ProductNotFound: 'PRODUCT_NOT_FOUND',
  CustomerNotFound: 'CUSTOMER_NOT_FOUND',
  TransactionNotFound: 'TRANSACTION_NOT_FOUND',
  OutOfStock: 'OUT_OF_STOCK',
  InvalidTransactionState: 'INVALID_TRANSACTION_STATE',
  IdempotencyKeyReused: 'IDEMPOTENCY_KEY_REUSED',
  GatewayRejected: 'GATEWAY_REJECTED',
  GatewayUnavailable: 'GATEWAY_UNAVAILABLE',
  RateLimited: 'RATE_LIMITED',
  Internal: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];