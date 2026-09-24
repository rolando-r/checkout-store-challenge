import {
  CustomerNotFoundError, GatewayRejectedError, GatewayUnavailableError,
  IdempotencyKeyReusedError, InvalidTransactionStateError, OutOfStockError,
  ProductNotFoundError, TransactionNotFoundError, UnexpectedError, ValidationError,
} from './domain-error';
import { toHttpError } from './error-http.mapper';

describe('toHttpError', () => {
  it.each([
    [new ValidationError([{ field: 'email', issue: 'invalid' }]), 400],
    [new ProductNotFoundError('p1'), 404],
    [new CustomerNotFoundError('c1'), 404],
    [new TransactionNotFoundError('t1'), 404],
    [new OutOfStockError(2), 409],
    [new InvalidTransactionStateError('APPROVED', 'PENDING'), 409],
    [new IdempotencyKeyReusedError(), 422],
    [new GatewayRejectedError('bad token'), 502],
    [new GatewayUnavailableError(), 503],
    [new UnexpectedError(), 500],
  ])('maps %p to HTTP %i', (error, status) => {
    const body = toHttpError(error, 'req-1');
    expect(body.statusCode).toBe(status);
    expect(body.code).toBe(error.code);
    expect(body.requestId).toBe('req-1');
  });

  it('exposes details for out of stock', () => {
    expect(toHttpError(new OutOfStockError(2), 'r').details).toEqual([
      { field: 'quantity', issue: 'max 2' },
    ]);
  });
});