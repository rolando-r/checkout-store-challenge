import { combine, err, flatMap, fromPromise, map, mapErr, match, ok } from './result';

describe('Result helpers', () => {
  it('map transforms Ok and skips Err', () => {
    expect(map(ok(2), (n) => n * 2)).toEqual(ok(4));
    expect(map(err('boom'), (n: number) => n * 2)).toEqual(err('boom'));
  });

  it('mapErr transforms Err and skips Ok', () => {
    expect(mapErr(err('a'), (e) => `${e}!`)).toEqual(err('a!'));
    expect(mapErr(ok(1), (e: string) => `${e}!`)).toEqual(ok(1));
  });

  it('flatMap chains and short-circuits', () => {
    const half = (n: number) => (n % 2 === 0 ? ok(n / 2) : err('odd'));
    expect(flatMap(ok(4), half)).toEqual(ok(2));
    expect(flatMap(ok(3), half)).toEqual(err('odd'));
    expect(flatMap(err('first'), half)).toEqual(err('first'));
  });

  it('match calls the right handler', () => {
    const handlers = { ok: (v: number) => `ok:${v}`, err: (e: string) => `err:${e}` };
    expect(match(ok(1), handlers)).toBe('ok:1');
    expect(match(err('x'), handlers)).toBe('err:x');
  });

  it('fromPromise wraps success and failure', async () => {
    expect(await fromPromise(async () => 5, () => 'fail')).toEqual(ok(5));
    expect(
      await fromPromise(async () => { throw new Error('x'); }, () => 'fail'),
    ).toEqual(err('fail'));
  });

  it('combine returns all values or the first error', () => {
    expect(combine([ok(1), ok(2)])).toEqual(ok([1, 2]));
    expect(combine([ok(1), err('a'), err('b')])).toEqual(err('a'));
  });
});