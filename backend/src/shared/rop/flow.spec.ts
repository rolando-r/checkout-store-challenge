import { Flow } from './flow';
import { err, ok } from './result';

describe('Flow', () => {
  it('runs every step when all succeed', async () => {
    const result = await Flow.of(ok(1))
      .andThen((n) => ok(n + 1))
      .andThen(async (n) => ok(n * 10))
      .map((n) => n + 1)
      .done();
    expect(result).toEqual(ok(21));
  });

  it('skips the remaining steps after the first error', async () => {
    const later = jest.fn();
    const result = await Flow.of(ok(1))
      .andThen(() => err('stop'))
      .andThen(later)
      .map(later)
      .tap(later)
      .done();
    expect(result).toEqual(err('stop'));
    expect(later).not.toHaveBeenCalled();
  });

  it('tap runs a side effect without changing the value', async () => {
    const spy = jest.fn();
    const result = await Flow.of(ok('a')).tap(spy).done();
    expect(spy).toHaveBeenCalledWith('a');
    expect(result).toEqual(ok('a'));
  });

  it('mapErr transforms the error only', async () => {
    expect(await Flow.of(err('a')).mapErr((e) => `${e}!`).done()).toEqual(err('a!'));
    expect(await Flow.of(ok(1)).mapErr((e: string) => `${e}!`).done()).toEqual(ok(1));
  });
});