import { hashRequest } from './hash-request';

describe('hashRequest', () => {
  it('returns a 64-character hex digest', () => {
    expect(hashRequest({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });

  it('ignores property order, including nested objects and arrays', () => {
    const one = { a: [1, { b: 2, a: 1 }], c: null };
    const two = { c: null, a: [1, { a: 1, b: 2 }] };
    expect(hashRequest(one)).toBe(hashRequest(two));
  });

  it('changes when a value changes', () => {
    expect(hashRequest({ quantity: 1 })).not.toBe(hashRequest({ quantity: 2 }));
  });

  it('respects array order', () => {
    expect(hashRequest([1, 2])).not.toBe(hashRequest([2, 1]));
  });
});