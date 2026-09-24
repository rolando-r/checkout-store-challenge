export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;
export type AsyncResult<T, E> = Promise<Result<T, E>>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const map = <T, U, E>(r: Result<T, E>, fn: (v: T) => U): Result<U, E> =>
  r.ok ? ok(fn(r.value)) : r;

export const mapErr = <T, E, F>(r: Result<T, E>, fn: (e: E) => F): Result<T, F> =>
  r.ok ? r : err(fn(r.error));

export const flatMap = <T, U, E, F>(
  r: Result<T, E>,
  fn: (v: T) => Result<U, F>,
): Result<U, E | F> => (r.ok ? fn(r.value) : r);

export const match = <T, E, R>(
  r: Result<T, E>,
  handlers: { ok: (v: T) => R; err: (e: E) => R },
): R => (r.ok ? handlers.ok(r.value) : handlers.err(r.error));

/** Runs a promise-returning function and converts a thrown error into an Err. */
export const fromPromise = async <T, E>(
  fn: () => Promise<T>,
  onError: (cause: unknown) => E,
): AsyncResult<T, E> => {
  try {
    return ok(await fn());
  } catch (cause) {
    return err(onError(cause));
  }
};

/** Returns all values, or the first error found. */
export const combine = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];
  for (const r of results) {
    if (!r.ok) return r;
    values.push(r.value);
  }
  return ok(values);
};