import { Result } from './result';

type MaybeAsync<T, E> = Result<T, E> | Promise<Result<T, E>>;

export class Flow<T, E> {
  private constructor(private readonly pending: Promise<Result<T, E>>) {}

  static of<T, E = never>(source: MaybeAsync<T, E>): Flow<T, E> {
    return new Flow(Promise.resolve(source));
  }

  /** Next step that can fail. Skipped if a previous step failed. */
  andThen<U, F>(fn: (value: T) => MaybeAsync<U, F>): Flow<U, E | F> {
    return new Flow<U, E | F>(
      this.pending.then(
        (r): MaybeAsync<U, E | F> => (r.ok ? fn(r.value) : r),
      ),
    );
  }

  /** Next step that cannot fail. */
  map<U>(fn: (value: T) => U | Promise<U>): Flow<U, E> {
    return new Flow<U, E>(
      this.pending.then(async (r): Promise<Result<U, E>> =>
        r.ok ? { ok: true, value: await fn(r.value) } : r,
      ),
    );
  }

  /** Side effect (logging, metrics) that leaves the value untouched. */
  tap(fn: (value: T) => void | Promise<void>): Flow<T, E> {
    return this.map(async (v) => {
      await fn(v);
      return v;
    });
  }

  mapErr<F>(fn: (error: E) => F): Flow<T, F> {
    return new Flow<T, F>(
      this.pending.then((r): Result<T, F> =>
        r.ok ? r : { ok: false, error: fn(r.error) },
      ),
    );
  }

  done(): Promise<Result<T, E>> {
    return this.pending;
  }
}