import { Result } from '../rop/result';

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (!result.ok) throw new Error(`Expected Ok, got Err: ${JSON.stringify(result.error)}`);
  return result.value;
};

export const unwrapErr = <T, E>(result: Result<T, E>): E => {
  if (result.ok) throw new Error('Expected Err, got Ok');
  return result.error;
};