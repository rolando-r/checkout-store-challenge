import { InvalidTransactionStateError } from '../errors/domain-error';
import { err, ok } from '../rop/result';
import { unwrapOrThrow } from './result-to-http';

describe('unwrapOrThrow', () => {
  it('returns the value when the Result is Ok', () => {
    expect(unwrapOrThrow(ok(42))).toBe(42);
  });

  it('throws the DomainError when the Result is Err', () => {
    const error = new InvalidTransactionStateError('APPROVED', 'PENDING');
    let thrown: unknown;
    try {
      unwrapOrThrow(err(error));
    } catch (caught) {
      thrown = caught;
    }
    expect(thrown).toBe(error);
  });
});