import { DomainError } from '../errors/domain-error';
import { Result } from '../rop/result';

/** Unwraps a Result: returns the value, or throws the DomainError so the
 * global filter maps it to the right HTTP status. Keeps controllers thin. */
export const unwrapOrThrow = <T, E extends DomainError>(result: Result<T, E>): T => {
  if (result.ok) return result.value;
  throw result.error;
};